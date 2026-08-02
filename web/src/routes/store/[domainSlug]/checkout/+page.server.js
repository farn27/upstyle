import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { ecommerceOrders, ecommerceOrderItems } from '$lib/server/schema';
import { log } from '$lib/server/logger';

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

        if (!cartData.length) {
            return { success: false, message: 'Keranjang kosong' };
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
