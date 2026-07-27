import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { budgetItems, chartOfAccounts, journalEntries, journalEntryLines } from '$lib/server/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { thisMonthWIB } from '$lib/server/dateUtils';

export const load = async ({ params, url, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const tahun = parseInt(url.searchParams.get('tahun') || thisMonthWIB().year);

    const budgetsRaw = await db.select({
        id: budgetItems.id,
        coaId: budgetItems.coaId,
        kodeAkun: chartOfAccounts.kodeAkun,
        namaAkun: chartOfAccounts.namaAkun,
        normalBalance: chartOfAccounts.normalBalance,
        tahun: budgetItems.tahun,
        bulan: budgetItems.bulan,
        nominal: budgetItems.nominal,
        keterangan: budgetItems.keterangan
    })
    .from(budgetItems)
    .innerJoin(chartOfAccounts, eq(budgetItems.coaId, chartOfAccounts.id))
    .where(and(eq(budgetItems.unitId, unit.id), eq(budgetItems.tahun, tahun)))
    .orderBy(desc(budgetItems.id));

    // Get all transactions for this unit and year
    const startOfYear = `${tahun}-01-01`;
    const endOfYear = `${tahun}-12-31`;

    const txsRaw = await db.select({
        coaId: journalEntryLines.coaId,
        debit: journalEntryLines.debit,
        kredit: journalEntryLines.kredit,
        tanggal: journalEntries.tanggal
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalId, journalEntries.id))
    .where(
        and(
            eq(journalEntries.unitId, unit.id),
            eq(journalEntries.status, 'POSTED'),
            gte(journalEntries.tanggal, startOfYear),
            lte(journalEntries.tanggal, endOfYear)
        )
    );

    // Calculate realisasi per budget item
    const budgetsWithRealisasi = budgetsRaw.map(b => {
        let realisasi = 0;
        
        // Filter transactions for this budget's COA
        const relevantTxs = txsRaw.filter(tx => tx.coaId === b.coaId);
        
        for (const tx of relevantTxs) {
            const txDate = new Date(tx.tanggal);
            const txMonth = txDate.getMonth() + 1;
            const txYear = txDate.getFullYear();
            
            // Check if transaction matches the budget period
            const isMatch = (b.bulan === 0 && txYear === b.tahun) || (b.bulan === txMonth && txYear === b.tahun);
            
            if (isMatch) {
                const debit = Number(tx.debit || 0);
                const kredit = Number(tx.kredit || 0);
                
                // Realisasi follows the normal balance of the account
                if (b.normalBalance === 'DEBIT') {
                    realisasi += (debit - kredit);
                } else {
                    realisasi += (kredit - debit);
                }
            }
        }
        
        return {
            ...b,
            realisasi
        };
    });

    const accounts = await db.query.chartOfAccounts.findMany({
        where: eq(chartOfAccounts.unitId, unit.id),
        orderBy: [chartOfAccounts.kodeAkun]
    });

    return {
        unit,
        tahun,
        budgets: JSON.parse(JSON.stringify(budgetsWithRealisasi)),
        accounts: JSON.parse(JSON.stringify(accounts))
    };
};

export const actions = {
    addBudget: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        const { slug } = params;
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit not found' });

        const data = await request.formData();
        const coaId = data.get('coaId');
        const tahun = data.get('tahun');
        const bulan = data.get('bulan');
        const nominal = data.get('nominal');
        const keterangan = data.get('keterangan');

        try {
            await db.insert(budgetItems).values({
                unitId: unit.id,
                coaId: Number(coaId),
                tahun: Number(tahun),
                bulan: Number(bulan),
                nominal: String(nominal),
                keterangan: keterangan || null
            });
            return { success: true };
        } catch (err) {
            console.error('Add Budget Error:', err);
            return fail(500, { error: 'Gagal menambah anggaran' });
        }
    }
};
