import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { ecommerceOrders, ecommerceOrderItems, products, ecommerceSettings } from '$lib/server/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { log } from '$lib/server/logger';
import { JENIS_DIJUAL } from '$lib/jenisProduk';

export const load = async ({ parent }) => {
    // Parent loader di layout sudah mengecek ketersediaan toko
    return {};
};

const teks = (/** @type {FormDataEntryValue | null} */ v, /** @type {number} */ maks) => String(v ?? '').trim().slice(0, maks);

export const actions = {
    placeOrder: async ({ request, params }) => {
        const formData = await request.formData();

        const customerName = teks(formData.get('customerName'), 100);
        const customerEmail = teks(formData.get('customerEmail'), 150);
        const customerPhone = teks(formData.get('customerPhone'), 30);
        const shippingAddress = teks(formData.get('shippingAddress'), 1000);
        if (!customerName || !customerPhone || !shippingAddress) {
            return { success: false, message: 'Nama, nomor HP, dan alamat pengiriman wajib diisi' };
        }
        if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
            return { success: false, message: 'Format email tidak valid' };
        }

        // Unit diambil dari toko yang dibuka (domainSlug), BUKAN dari isian formulir; dulu unitId, harga, dan total
        // dikirim peramban sehingga pembeli bisa mengubah harga/total (mis. jadi Rp1) atau memesan ke unit lain.
        const [toko] = await db
            .select({ unitId: ecommerceSettings.unitId, isActive: ecommerceSettings.isActive })
            .from(ecommerceSettings)
            .where(eq(ecommerceSettings.domainSlug, params.domainSlug))
            .limit(1);
        if (!toko || !toko.isActive) return { success: false, message: 'Toko tidak ditemukan atau sedang tutup' };
        const unitId = Number(toko.unitId);

        let cartData = [];
        try {
            cartData = JSON.parse(String(formData.get('cartData') || '[]'));
        } catch (e) {
            return { success: false, message: 'Data keranjang tidak valid' };
        }
        if (!Array.isArray(cartData) || !cartData.length || cartData.length > 100) {
            return { success: false, message: 'Keranjang kosong' };
        }

        /** @type {Map<string, number>} */
        const jumlah = new Map();
        for (const item of cartData) {
            const id = String(item?.productId || '');
            const qty = Number(item?.qty);
            if (!id || !Number.isInteger(qty) || qty < 1 || qty > 999) {
                return { success: false, message: 'Jumlah barang di keranjang tidak valid' };
            }
            jumlah.set(id, (jumlah.get(id) || 0) + qty);
        }

        // Hanya barang jadi aktif milik toko ini yang boleh dipesan; harga & stok dibaca dari database
        const idProduk = [...jumlah.keys()];
        const daftar = await db.select({ id: products.id, nama: products.nama, hargaJual: products.hargaJual, stok: products.stok })
            .from(products)
            .where(and(
                eq(products.unitId, unitId), inArray(products.id, idProduk), isNull(products.deletedAt),
                eq(products.status, 'active'), eq(products.jenis, JENIS_DIJUAL)
            ));
        if (daftar.length !== idProduk.length) {
            return { success: false, message: 'Ada produk di keranjang yang sudah tidak dijual. Muat ulang halaman toko.' };
        }
        const kurang = daftar.find((p) => Number(p.stok || 0) < (jumlah.get(String(p.id)) || 0));
        if (kurang) return { success: false, message: `Stok ${kurang.nama} tidak cukup (tersisa ${kurang.stok})` };

        const items = daftar.map((p) => {
            const qty = jumlah.get(String(p.id)) || 0;
            const harga = Number(p.hargaJual || 0);
            return { productId: p.id, qty, harga, total: Math.round(qty * harga * 100) / 100 };
        });
        const totalAmount = Math.round(items.reduce((a, it) => a + it.total, 0) * 100) / 100;

        const orderNumber = 'ECO-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 1000);

        try {
            await db.transaction(async (/** @type {any} */ tx) => {
                const [insertResult] = await tx.insert(ecommerceOrders).values({
                    unitId,
                    orderNumber,
                    customerName,
                    customerEmail: customerEmail || null,
                    customerPhone,
                    shippingAddress,
                    subtotal: totalAmount.toString(),
                    totalAmount: totalAmount.toString(),
                    paymentStatus: 'PENDING',
                    shippingStatus: 'PENDING'
                });
                const newOrderId = insertResult.insertId;
                await tx.insert(ecommerceOrderItems).values(items.map((it) => ({
                    ecommerceOrderId: newOrderId,
                    productId: it.productId,
                    qty: it.qty,
                    price: it.harga.toString(),
                    total: it.total.toString()
                })));
            });
        } catch (err) {
            log.api.error({ err }, 'Error placing order');
            return { success: false, message: 'Gagal membuat pesanan' };
        }

        throw redirect(303, `/store/${params.domainSlug}/checkout/success?order=${orderNumber}`);
    }
};
