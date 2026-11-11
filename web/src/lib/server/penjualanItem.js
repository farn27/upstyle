/** Validasi bersama untuk penawaran & sales order (app): item, produk, dan pelanggan harus milik unit yang sama. */
import { db } from '$lib/server/drizzle';
import { crmContacts, products } from '$lib/server/schema';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Validasi + hitung baris item: produk harus milik unit, qty bulat > 0, harga >= 0.
 * @returns {Promise<{ error?: string, rows?: Array<{ productId: string | null, qty: number, price: number, total: number }>, total?: number }>}
 */
export async function siapkanItem(unitId, items) {
    if (!Array.isArray(items) || items.length === 0) return { error: 'Minimal 1 item produk' };
    const rows = [];
    for (const it of items) {
        const qty = Math.trunc(Number(it?.qty));
        const price = Number(it?.price);
        if (!Number.isFinite(qty) || qty <= 0) return { error: 'Jumlah item harus lebih dari 0' };
        if (!Number.isFinite(price) || price < 0) return { error: 'Harga item tidak valid' };
        const productId = it?.productId ? String(it.productId) : null;
        rows.push({ productId, qty, price, total: qty * price });
    }
    const ids = [...new Set(rows.map((r) => r.productId).filter(Boolean))];
    if (ids.length) {
        const ada = await db.select({ id: products.id }).from(products).where(and(eq(products.unitId, unitId), inArray(products.id, /** @type {string[]} */ (ids))));
        if (ada.length !== ids.length) return { error: 'Ada produk yang bukan milik unit ini' };
    }
    return { rows, total: rows.reduce((a, r) => a + r.total, 0) };
}

/** Pelanggan (kontak CRM) harus milik unit yang sama. */
export async function pelangganValid(unitId, customerId) {
    if (!customerId) return true;
    const k = await db.query.crmContacts.findFirst({ where: and(eq(crmContacts.id, Number(customerId)), eq(crmContacts.unitId, unitId)), columns: { id: true } });
    return !!k;
}

