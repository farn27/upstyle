import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { journalEntries, journalEntryLines, chartOfAccounts } from '$lib/server/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { thisMonthWIB } from '$lib/server/dateUtils';

export const load = async ({ params, url, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;
    
    // Cek kepemilikan unit
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    // Filter bulan dan tahun
    const tahun = parseInt(url.searchParams.get('tahun') || thisMonthWIB().year);
    const bulan = url.searchParams.get('bulan') || 'all';

    let dateFilter = sql`YEAR(${journalEntries.tanggal}) = ${tahun}`;
    if (bulan !== 'all') {
        dateFilter = and(dateFilter, sql`MONTH(${journalEntries.tanggal}) = ${parseInt(bulan)}`);
    }

    const baseFilter = and(eq(journalEntries.unitId, unit.id), dateFilter);

    // 2-step query karena TiDB tidak support LATERAL JOIN dari Drizzle `with:`
    // Step 1: fetch journal entries
    const entriesRaw = await db.select().from(journalEntries)
        .where(baseFilter)
        .orderBy(desc(journalEntries.tanggal), desc(journalEntries.id))
        .limit(500);

    // Step 2: fetch lines for those entries
    const entryIds = entriesRaw.map(e => e.id);
    let linesWithAccounts = [];
    if (entryIds.length > 0) {
        const linesRaw = await db.select().from(journalEntryLines)
            .where(inArray(journalEntryLines.journalId, entryIds));
        // fetch accounts for lines
        const coaIds = [...new Set(linesRaw.map(l => l.coaId).filter(Boolean))];
        const accountsMap = {};
        if (coaIds.length > 0) {
            const accts = await db.select().from(chartOfAccounts)
                .where(inArray(chartOfAccounts.id, coaIds));
            accts.forEach(a => { accountsMap[a.id] = a; });
        }
        linesWithAccounts = linesRaw.map(l => ({ ...l, account: accountsMap[l.coaId] || null }));
    }

    // Merge lines into entries
    const linesGrouped = {};
    linesWithAccounts.forEach(l => {
        if (!linesGrouped[l.journalId]) linesGrouped[l.journalId] = [];
        linesGrouped[l.journalId].push(l);
    });
    const entries = entriesRaw.map(e => ({ ...e, lines: linesGrouped[e.id] || [] }));


    const accounts = await db.query.chartOfAccounts.findMany({
        where: and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.isActive, true)),
        orderBy: [chartOfAccounts.kodeAkun]
    });

    return {
        unit,
        tahun,
        bulan,
        entries: JSON.parse(JSON.stringify(entries)),
        accounts: JSON.parse(JSON.stringify(accounts))
    };
};

export const actions = {
    createManualJournal: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        const { slug } = params;
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit not found' });

        const data = await request.formData();
        const tanggal = data.get('tanggal');
        const referensi = data.get('referensi');
        const memo = data.get('memo');
        
        // Parsing lines dari formData (bisa banyak baris debit/kredit)
        // Format naming: account_id_0, debit_0, kredit_0
        const lines = [];
        let index = 0;
        let totalDebit = 0;
        let totalKredit = 0;

        while (data.has(`account_id_${index}`)) {
            const accountId = data.get(`account_id_${index}`);
            const debitVal = Number(data.get(`debit_${index}`) || 0);
            const kreditVal = Number(data.get(`kredit_${index}`) || 0);
            const keterangan = data.get(`keterangan_${index}`) || memo;

            if (accountId && (debitVal > 0 || kreditVal > 0)) {
                lines.push({
                    coaId: Number(accountId),
                    debit: String(debitVal),
                    kredit: String(kreditVal),
                    keterangan
                });
                totalDebit += debitVal;
                totalKredit += kreditVal;
            }
            index++;
        }

        if (lines.length < 2) {
            return fail(400, { error: 'Jurnal minimal harus memiliki 2 baris (Debit & Kredit).' });
        }

        if (totalDebit !== totalKredit) {
            return fail(400, { error: `Total Debit (Rp ${totalDebit}) dan Kredit (Rp ${totalKredit}) tidak seimbang (Balance).` });
        }

        try {
            await db.transaction(async (tx) => {
                const [jurnalResult] = await tx.execute(
                    `INSERT INTO journal_entries (unit_id, user_id, tanggal, nomor_jurnal, referensi, memo, source_type, total_debit, total_kredit, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [unit.id, userId, tanggal, `JRN-MANUAL-${Date.now()}`, referensi || null, memo || null, 'MANUAL', String(totalDebit), String(totalKredit), 'POSTED']
                );

                const journalId = jurnalResult.insertId;

                for (const line of lines) {
                    await tx.execute(
                        `INSERT INTO journal_entry_lines (journal_id, coa_id, keterangan, debit, kredit) VALUES (?, ?, ?, ?, ?)`,
                        [journalId, line.coaId, line.keterangan, line.debit, line.kredit]
                    );
                }
            });

            return { success: true };
        } catch (err) {
            console.error('Manual Journal Error:', err);
            return fail(500, { error: 'Gagal menyimpan jurnal manual' });
        }
    }
};
