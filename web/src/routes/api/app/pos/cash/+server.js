import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posCashTransactions, posShifts } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET: Fetch cash transactions for a shift
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const shiftId = url.searchParams.get('shiftId');
    if (!shiftId) return json({ success: false, message: "shiftId wajib diisi" }, { status: 400 });

    try {
        const transactions = await db.query.posCashTransactions.findMany({
            where: eq(posCashTransactions.shiftId, Number(shiftId)),
            orderBy: [desc(posCashTransactions.createdAt)]
        });

        return json({
            success: true,
            message: "Berhasil mengambil data transaksi kas",
            data: transactions
        });
    } catch (err) {
        log.pos.error({ err }, 'API GET POS CASH TRANSACTIONS ERROR');
        return json({ success: false, message: "Gagal mengambil data transaksi kas" }, { status: 500 });
    }
}

// POST: Create a cash in/out entry within a shift
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { shiftId, unitId, type, amount, description } = body;

        if (!shiftId || !type || amount === undefined || amount === null || !['CASH_IN', 'CASH_OUT'].includes(type)) {
            return json({ success: false, message: "Data transaksi kas tidak valid" }, { status: 400 });
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return json({ success: false, message: "Jumlah kas harus berupa angka positif" }, { status: 400 });
        }

        const [result] = await db.insert(posCashTransactions).values({
            shiftId: Number(shiftId),
            type,
            amount: String(numAmount),
            description: description || null
        });

        return json({
            success: true,
            message: `Transaksi kas ${type === 'CASH_IN' ? 'masuk' : 'keluar'} berhasil dicatat`,
            data: {
                id: result.insertId,
                shiftId: Number(shiftId),
                unitId: unitId ? Number(unitId) : undefined,
                type,
                amount: numAmount,
                description: description || null
            }
        });
    } catch (err) {
        log.pos.error({ err }, 'API POST POS CASH TRANSACTION ERROR');
        return json({ success: false, message: "Gagal mencatat transaksi kas" }, { status: 500 });
    }
}
