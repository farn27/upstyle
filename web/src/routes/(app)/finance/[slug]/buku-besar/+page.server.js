import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { journalEntries, journalEntryLines, chartOfAccounts } from '$lib/server/schema';
import { eq, desc, and, sql, asc } from 'drizzle-orm';
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
    const accountId = url.searchParams.get('account') || 'all';

    let dateFilter = sql`YEAR(${journalEntries.tanggal}) = ${tahun}`;
    if (bulan !== 'all') {
        dateFilter = and(dateFilter, sql`MONTH(${journalEntries.tanggal}) = ${parseInt(bulan)}`);
    }

    const baseFilter = and(eq(journalEntries.unitId, unit.id), dateFilter);

    // Get all active accounts for dropdown
    const accounts = await db.query.chartOfAccounts.findMany({
        where: and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.isActive, true)),
        orderBy: [chartOfAccounts.kodeAkun]
    });

    let lines = [];
    if (accountId !== 'all') {
        // Query ledger lines for a specific account
        lines = await db.select({
            date: journalEntries.tanggal,
            referenceNo: journalEntries.referensi,
            description: journalEntries.memo,
            source: journalEntries.sourceType,
            debit: journalEntryLines.debit,
            credit: journalEntryLines.kredit,
        })
        .from(journalEntryLines)
        .leftJoin(journalEntries, eq(journalEntryLines.journalId, journalEntries.id))
        .where(
            and(
                baseFilter,
                eq(journalEntryLines.coaId, accountId)
            )
        )
        .orderBy(asc(journalEntries.tanggal), asc(journalEntries.id));
    }

    // Hitung saldo awal & saldo akhir jika akun dipilih
    let openingBalance = 0;
    let selectedAccountData = null;

    if (accountId !== 'all') {
        selectedAccountData = accounts.find(a => a.id == accountId);
        
        // Query to calculate opening balance (sebelum periode yang dipilih)
        // Kita hitung dari awal masa (semua jurnal sebelum filter dateFilter)
        // Ini asumsikan tahun dan bulan adalah periode saat ini
        let openingDateFilter = sql`YEAR(${journalEntries.tanggal}) < ${tahun}`;
        if (bulan !== 'all') {
            openingDateFilter = sql`(YEAR(${journalEntries.tanggal}) < ${tahun} OR (YEAR(${journalEntries.tanggal}) = ${tahun} AND MONTH(${journalEntries.tanggal}) < ${parseInt(bulan)}))`;
        }

        const [openingResult] = await db.select({
            totalDebit: sql`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
            totalCredit: sql`COALESCE(SUM(${journalEntryLines.kredit}), 0)`
        })
        .from(journalEntryLines)
        .leftJoin(journalEntries, eq(journalEntryLines.journalId, journalEntries.id))
        .where(
            and(
                eq(journalEntries.unitId, unit.id),
                eq(journalEntryLines.coaId, accountId),
                openingDateFilter
            )
        );

        if (selectedAccountData) {
            // Hitung opening balance berdasarkan normal balance
            let startBalance = 0; // Tidak ada opening balance di skema saat ini
            let trxDebit = Number(openingResult?.totalDebit || 0);
            let trxCredit = Number(openingResult?.totalCredit || 0);
            
            if (selectedAccountData.normalBalance === 'DEBIT') {
                openingBalance = startBalance + trxDebit - trxCredit;
            } else {
                openingBalance = startBalance + trxCredit - trxDebit;
            }
        }
    }

    return {
        unit,
        tahun,
        bulan,
        accountId,
        accounts: JSON.parse(JSON.stringify(accounts)),
        lines: JSON.parse(JSON.stringify(lines)),
        openingBalance,
        selectedAccountData: selectedAccountData ? JSON.parse(JSON.stringify(selectedAccountData)) : null
    };
};
