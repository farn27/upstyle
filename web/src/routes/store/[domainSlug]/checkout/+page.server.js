import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { ecommerceOrders, ecommerceOrderItems, products } from '$lib/server/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { log } from '$lib/server/logger';
import { JENIS_DIJUAL } from '$lib/jenisProduk';

export const load = async ({ parent }) => {
    // Parent loader di layout sudah mengecek ketersediaan toko
    return {};
};

export const actions = {
    placeOrder: async ({ request, params }) => {
        const formData = await request.formData();
        
        const customerName = formData.get('customerName');
        const customerEmail = formData.get('customerEmail');
        const customerPhone = formData.get('customerPhone');
        const shippingAddress = formData.get('shippingAddress');
        const totalAmount = Number(formData.get('totalAmount'));
        const unitId = Number(formData.get('unitId'));
        
        let cartData = [];
        try {
            cartData = JSON.parse(formData.get('cartData'));
        } catch (e) {
            return { success: false, message: 'Data keranjang tidak valid' };
        }

        if (!Array.isArray(cartData) || !cartData.length) {
            return { success: false, message: 'Keranjang kosong' };
        }

        // Hanya barang jadi aktif milik toko ini yang boleh dipesan (bahan baku, kemasan, dll. tidak dijual)
        const idProduk = [...new Set(cartData.map((item) => String(item?.productId || '')))];
        const bolehDijual = idProduk.every(Boolean) && unitId
            ? await db.select({ id: products.id }).from(products).where(and(
                eq(products.unitId, unitId), inArray(products.id, idProduk), isNull(products.deletedAt),
                eq(products.status, 'active'), eq(products.jenis, JENIS_DIJUAL)
            ))
            : [];
        if (bolehDijual.length !== idProduk.length) {
            return { success: false, message: 'Ada produk di keranjang yang sudah tidak dijual. Muat ulang halaman toko.' };
        }

        // Generate Order Number unik
        const orderNumber = 'ECO-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 1000);

        try {
            // Kita gunakan transaksi jika memungkinkan, tapi Drizzle mysql2 kadang tidak full support transaction tergantung setup
            // Lakukan insert order
            const [insertResult] = await db.insert(ecommerceOrders).values({
                unitId,
                orderNumber,
                customerName,
                customerEmail,
                customerPhone,
                shippingAddress,
                subtotal: totalAmount.toString(),
                totalAmount: totalAmount.toString(),
                paymentStatus: 'PENDING',
                shippingStatus: 'PENDING'
            });

            const newOrderId = insertResult.insertId;

            // Insert Items
            const itemsToInsert = cartData.map(item => ({
                ecommerceOrderId: newOrderId,
                productId: item.productId,
                qty: item.qty,
                price: item.price.toString(),
                total: (item.qty * item.price).toString()
            }));

            await db.insert(ecommerceOrderItems).values(itemsToInsert);

        } catch (err) {
            log.api.error({ err }, 'Error placing order');
            return { success: false, message: 'Gagal membuat pesanan' };
        }

        // Jika berhasil, arahkan ke halaman sukses
        throw redirect(303, `/store/${params.domainSlug}/checkout/success?order=${orderNumber}`);
    }
};
