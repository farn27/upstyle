import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posOrders, posOrderItems, posCustomers, products, transaksi, riwayatAksi, abcCategories, chartOfAccounts, journalEntries, journalEntryLines } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import crypto from 'crypto';
import { pusherServer } from '$lib/server/pusher';
import { redis } from '$lib/server/redis';
import { nowWIB } from '$lib/server/dateUtils';

// 1. GET: Ambil list order POS dan customer POS untuk unitId
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        // Fetch POS orders
        const ordersList = await db.query.posOrders.findMany({
            where: eq(posOrders.unitId, Number(unitId)),
            orderBy: [desc(posOrders.id)]
        });

        // Fetch POS customers
        const customersList = await db.query.posCustomers.findMany({
            where: eq(posCustomers.unitId, Number(unitId)),
            orderBy: [desc(posCustomers.id)]
        });

        // Map to structure expected by mobile app
        const mappedOrders = ordersList.map(o => ({
            id: String(o.id),
            orderNumber: o.orderNumber,
            unitId: o.unitId,
            customerId: o.customerId,
            subtotal: Number(o.subtotal || 0),
            total: Number(o.total || 0),
            paymentMethod: o.paymentMethod || 'CASH',
            status: o.status || 'COMPLETED',
            tanggal: o.createdAt ? new Date(o.createdAt).getTime() : Date.now()
        }));

        const mappedCustomers = customersList.map(c => ({
            id: c.id,
            unitId: c.unitId,
            namaCustomer: c.namaCustomer,
            email: c.email || '',
            telepon: c.telepon || ''
        }));

        return json({
            success: true,
            data: {
                orders: mappedOrders,
                customers: mappedCustomers
            }
        });

    } catch (err) {
        console.error("API GET POS ERROR:", err);
        return json({ success: false, message: "Gagal mengambil data POS" }, { status: 500 });
    }
}

// 2. POST: Checkout Order POS atau Tambah Customer POS
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action; // 'checkout' or 'create-customer'

        if (action === 'create-customer') {
            const { namaCustomer, email, telepon, unitId } = body.customer;

            const [result] = await db.insert(posCustomers).values({
                unitId: Number(unitId), namaCustomer, email: email || null, telepon: telepon || null
            });

            // Log action
            await db.insert(riwayatAksi).values({
                userId, unitId: Number(unitId), pesan: `Customer POS ditambahkan: ${namaCustomer}`, kategori: 'POS', tipe: 'success'
            });

            return json({ success: true, message: "Customer berhasil ditambahkan", data: { id: result.insertId } });
        }

        if (action === 'checkout') {
            const { orderNumber, unitId, customerId, subtotal, total, paymentMethod, items } = body.order;

            let finalOrderId = null;
            await db.transaction(async (tx) => {
                // 1. Insert order
                const [orderInsertResult] = await tx.insert(posOrders).values({
                    orderNumber: orderNumber || `POS-${unitId}-${Date.now()}`, unitId: Number(unitId), customerId: customerId || null, createdBy: userId, subtotal: String(subtotal || 0), discount: '0', total: String(total || 0), paymentMethod: paymentMethod || 'CASH', status: 'PAID'
                });

                finalOrderId = orderInsertResult.insertId;

                // 2. Insert items and reduce stock
                for (const item of items) {
                    const qty = Number(item.qty || 1);
                    const price = Number(item.price || 0);
                    const nominal = price * qty;

                    const prod = await tx.query.products.findFirst({
                        where: eq(products.id, item.productId)
                    });

                    if (prod) {
                        const newStock = Math.max(0, (prod.stok || 0) - qty);
                        await tx.update(products)
                            .set({ stok: newStock })
                            .where(eq(products.id, item.productId));

                        await tx.insert(posOrderItems).values({
                            orderId: finalOrderId, productId: item.productId, variantId: item.variantId || null, productName: item.productName, qty: qty, price: String(price), total: String(nominal), costTotal: String(Number(prod.hargaBeli || 0) * qty)
                        });

                        // Save transaction
                        await tx.insert(transaksi).values({
                            userId: userId,
                            unitId: Number(unitId),
                            keterangan: `Penjualan POS: ${item.productName} (${qty}x)`,
                            nominal: String(nominal),
                            totalHarga: String(nominal),
                            kategoriTrx: 'MASUK',
                            metodeBayar: paymentMethod || 'CASH',
                            productId: item.productId,
                            qty: qty,
                            hppTotal: String(Number(prod.hargaBeli || 0) * qty)
                        });
                    }
                }

                // 3. Log action
                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: Number(unitId),
                    pesan: `Transaksi POS selesai #${orderNumber}. Total: Rp ${String(total)}`,
                    kategori: 'POS',
                    tipe: 'success'
                });

                // 4. Accounting COA Journal entries
                const coaCash = await tx.query.chartOfAccounts.findFirst({
                    where: and(eq(chartOfAccounts.unitId, Number(unitId)), eq(chartOfAccounts.tipeAkun, 'ASET_LANCAR'))
                });
                const coaRevenue = await tx.query.chartOfAccounts.findFirst({
                    where: and(eq(chartOfAccounts.unitId, Number(unitId)), eq(chartOfAccounts.tipeAkun, 'PENDAPATAN'))
                });

                if (coaCash && coaRevenue && Number(total || 0) > 0) {
                    const [jurnalResult] = await tx.insert(journalEntries).values({
                        unitId: Number(unitId), userId: String(userId), tanggal: nowWIB().toISOString().split('T')[0], nomorJurnal: `JRN-POS-${orderNumber}`, referensi: orderNumber, memo: 'Pendapatan POS', sourceType: 'POS', sourceId: String(finalOrderId), totalDebit: String(total), totalKredit: String(total), status: 'POSTED'
                    });
                    const journalId = jurnalResult.insertId;

                    // Debit Cash
                    await tx.insert(journalEntryLines).values({
                        journalId, coaId: coaCash.id, keterangan: `Penerimaan Kas - ${orderNumber}`, debit: String(total), kredit: '0'
                    });

                    // Credit Revenue
                    await tx.insert(journalEntryLines).values({
                        journalId, coaId: coaRevenue.id, keterangan: `Pendapatan Penjualan - ${orderNumber}`, debit: '0', kredit: String(total)
                    });
                }
            });

            const unit = await db.query.unitBisnis.findFirst({
                where: eq(unitBisnis.id, Number(unitId))
            });
            const slug = unit?.slug || '';
            if (slug) {
                const productKeys = await redis.keys(`cache:products_page_v4:${slug}:*`);
                if (productKeys.length > 0) await redis.del(...productKeys);

                pusherServer.trigger(`finance-${slug}`, 'stats-updated', { message: `POS order ${orderNumber}` });
                pusherServer.trigger('finance-channel', 'new-transaction', { message: `POS order ${orderNumber}` });
                pusherServer.trigger('channel-bizgrow', 'notif-baru', {
                    id: Date.now(),
                    unitId: Number(unitId),
                    pesan: `Transaksi POS selesai #${orderNumber}. Total: Rp ${String(total)}`,
                    kategori: 'POS',
                    tipe: 'success',
                    waktu: nowWIB()
                });
            }

            return json({ success: true, message: "Transaksi berhasil diproses", id: String(finalOrderId) });
        }

        return json({ success: false, message: "Aksi tidak dikenali" }, { status: 400 });

    } catch (err) {
        console.error("API POST POS ERROR:", err);
        return json({ success: false, message: "Gagal memproses POS: " + err.message }, { status: 500 });
    }
}
