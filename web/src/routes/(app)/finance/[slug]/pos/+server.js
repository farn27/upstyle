import { json } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { db } from '$lib/server/drizzle';
import { transaksi, unitBisnis, products, riwayatAksi, abcCategories, posCustomers, posOrders, posOrderItems, chartOfAccounts, journalEntries, journalEntryLines, posPayments, vouchers } from '$lib/server/schema';
import { log } from '$lib/server/logger.js';
import { eq, and, sql } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { pusherServer } from '$lib/server/pusher';
import { nowWIB } from '$lib/server/dateUtils';

export async function POST({ request, cookies, params, locals }) {
    try {
        const ownerUserId = locals.user?.id ?? await getCurrentUserId(cookies);
        const { slug } = params;
        const rawSession = cookies.get('staff_session');
        let loginSlugFromCookie = null;
        if (rawSession) {
            try {
                loginSlugFromCookie = JSON.parse(rawSession)?.login_slug || null;
            } catch (err) {
                log.pos.warn({ err: err.message }, 'POS raw staff_session cookie parse failed');
            }
        }

        let staffSession = await getVerifiedStaffSession(cookies, { unitSlug: slug });
        if (!staffSession && loginSlugFromCookie) {
            staffSession = await getVerifiedStaffSession(cookies, { loginSlug: loginSlugFromCookie });
        }
        if (!staffSession) {
            staffSession = await getVerifiedStaffSession(cookies);
        }

        const { cart, payment_method, payments, amount_paid, change_amount, keterangan, customer_id, customer_name, voucher_id, discount_value, order_type, table_number, queue_number } = await request.json();
        const actorId = staffSession?.id || ownerUserId || null;
        if (!actorId) return json({ error: "Sesi berakhir" }, { status: 401 });

        const customerNameSafe = String(customer_name || '').trim();

        // abcCategoryId removed in favor of COA/Journal system

        let orderNumber;
        let finalOrderId = null;
        await db.transaction(async (tx) => {
            let unit = null;

            if (staffSession) {
                unit = await tx.query.unitBisnis.findFirst({
                    where: eq(unitBisnis.id, staffSession.unit_id)
                });
            }

            if (unit && unit.slug !== slug && unit.loginSlug !== slug) {
                let routeUnit = await tx.query.unitBisnis.findFirst({
                    where: eq(unitBisnis.slug, slug)
                });

                if (!routeUnit) {
                    routeUnit = await tx.query.unitBisnis.findFirst({
                        where: eq(unitBisnis.loginSlug, slug)
                    });
                }

                if (routeUnit) {
                    log.pos.warn({ routeSlug: slug, staffUnitSlug: unit.slug, staffLoginSlug: unit.loginSlug, routeUnitId: routeUnit.id }, 'POS: staff session unit slug mismatch, using route unit');
                    unit = routeUnit;
                }
            }

            if (!unit) {
                if (ownerUserId) {
                    unit = await tx.query.unitBisnis.findFirst({
                        where: and(
                            eq(unitBisnis.slug, slug),
                            eq(unitBisnis.userId, ownerUserId)
                        )
                    });
                }
            }

            if (!unit) {
                unit = await tx.query.unitBisnis.findFirst({
                    where: eq(unitBisnis.slug, slug)
                });
            }

            if (!unit && ownerUserId) {
                unit = await tx.query.unitBisnis.findFirst({
                    where: and(
                        eq(unitBisnis.loginSlug, slug),
                        eq(unitBisnis.userId, ownerUserId)
                    )
                });
            }

            if (!unit) {
                unit = await tx.query.unitBisnis.findFirst({
                    where: eq(unitBisnis.loginSlug, slug)
                });
            }

            if (!unit) throw new Error('Unit tidak ditemukan');

            const isOwner = ownerUserId && Number(unit.userId) === Number(ownerUserId);
            const isStaff = staffSession && Number(unit.id) === Number(staffSession.unit_id);
            if (!isOwner && !isStaff) throw new Error('Akses ditolak untuk melakukan transaksi POS');

            let customerId = null;
            if (customer_id) {
                const customer = await tx.query.posCustomers.findFirst({
                    where: and(eq(posCustomers.id, Number(customer_id)), eq(posCustomers.unitId, unit.id))
                });
                if (customer) customerId = customer.id;
            }

            if (!customerId && customerNameSafe) {
                const existingCustomer = await tx.query.posCustomers.findFirst({
                    where: and(eq(posCustomers.unitId, unit.id), eq(posCustomers.namaCustomer, customerNameSafe))
                });
                if (existingCustomer) {
                    customerId = existingCustomer.id;
                } else {
                    const insertCustomer = await tx.insert(posCustomers).values({
                        unitId: unit.id,
                        namaCustomer: customerNameSafe,
                        email: null,
                        telepon: null,
                        metadata: null
                    });
                    customerId = insertCustomer.insertId;
                }
            }

            orderNumber = `POS-${unit.id}-${Date.now()}`;
            const orderSubtotal = cart.reduce((sum, item) => sum + (Number(item.harga_jual || item.harga || 0) * Number(item.qty || 1)), 0);
            
            let finalDiscountValue = 0;
            if (voucher_id) {
                const voucher = await tx.query.vouchers.findFirst({
                    where: and(eq(vouchers.id, Number(voucher_id)), eq(vouchers.unitId, unit.id))
                });
                if (voucher && voucher.isActive) {
                    const today = new Date().toISOString().split('T')[0];
                    const isValidDate = voucher.validFrom <= today && voucher.validUntil >= today;
                    const isValidUsage = voucher.maxUsage === 0 || voucher.currentUsage < voucher.maxUsage;
                    const isMinPurchaseMet = orderSubtotal >= Number(voucher.minPurchase);

                    if (isValidDate && isValidUsage && isMinPurchaseMet) {
                        if (voucher.discountType === 'PERCENTAGE') {
                            finalDiscountValue = Math.floor(orderSubtotal * (Number(voucher.discountValue) / 100));
                        } else {
                            finalDiscountValue = Number(voucher.discountValue);
                        }
                    }
                }
            } else if (discount_value) {
                // If there's no voucher but there is a manual discount (maybe from a manager override feature in the future)
                // We'll trust it for now as per current implementation, but usually, it should be validated.
                finalDiscountValue = Number(discount_value);
            } else if (keterangan?.discount) {
                finalDiscountValue = Number(keterangan.discount);
            }

            const orderTotal = Math.max(0, orderSubtotal - finalDiscountValue);

            const [orderInsertResult] = await tx.insert(posOrders).values({
                orderNumber,
                unitId: unit.id,
                customerId,
                createdBy: actorId,
                cashierId: staffSession?.id || null,
                subtotal: String(orderSubtotal),
                discount: String(finalDiscountValue),
                total: String(orderTotal),
                paymentMethod: payments?.length > 0 ? payments[0].method : (payment_method?.toUpperCase() || 'CASH'),
                amountPaid: String(amount_paid || 0),
                change: String(change_amount || 0),
                voucherId: voucher_id ? Number(voucher_id) : null,
                status: 'PAID',
                orderType: order_type || 'TAKEAWAY',
                tableNumber: table_number || null,
                queueNumber: queue_number || null,
                fulfillmentStatus: (order_type || queue_number || table_number) ? 'PENDING' : 'COMPLETED',
                notes: keterangan || null
            });
            
            if (voucher_id) {
                // Update voucher usage
                await tx.update(vouchers)
                    .set({ currentUsage: sql`current_usage + 1` })
                    .where(eq(vouchers.id, Number(voucher_id)));
            }
            
            const orderId = orderInsertResult.insertId;
            if (!orderId) throw new Error('Gagal membuat order POS');
            finalOrderId = orderId;

            if (payments && payments.length > 0) {
                for (const p of payments) {
                    await tx.insert(posPayments).values({
                        orderId: orderId,
                        method: p.method.toUpperCase(),
                        amount: String(p.amount)
                    });
                }
            } else {
                await tx.insert(posPayments).values({
                    orderId: orderId,
                    method: payment_method?.toUpperCase() || 'CASH',
                    amount: String(amount_paid || orderTotal)
                });
            }

            for (const item of cart) {
                const qty = Number(item.qty || 1);
                const unitPrice = Number(item.harga_jual || item.harga || 0);
                const nominal = unitPrice * qty;

                const produk = await tx.query.products.findFirst({
                    where: eq(products.id, item.id)
                });
                if (!produk) throw new Error(`Produk ${item.nama} tidak ditemukan`);
                if (produk.stok < qty) {
                    throw new Error(`Stok ${produk.nama} tidak mencukupi! (Sisa: ${produk.stok})`);
                }

                await tx.insert(posOrderItems).values({
                    orderId: orderId,
                    productId: String(item.id),
                    variantId: item.variantId || null,
                    productName: item.nama,
                    sku: item.sku || produk.sku || null,
                    qty: qty,
                    price: String(unitPrice),
                    total: String(nominal),
                    costTotal: String(Number(produk.hargaBeli || 0) * qty),
                    createdAt: nowWIB()
                });

                await tx.update(products)
                    .set({ stok: produk.stok - qty })
                    .where(eq(products.id, item.id));

                await tx.insert(transaksi).values({
                    userId: actorId,
                    unitId: unit.id,
                    tanggal: nowWIB(),
                    keterangan: `Penjualan ${item.nama} (${qty}x)`,
                    nominal: String(nominal),
                    totalHarga: String(nominal),
                    kategoriTrx: 'MASUK',
                    metodeBayar: payment_method?.toUpperCase() || 'CASH',
                    productId: item.id,
                    qty,
                    hppTotal: String(Number(produk.hargaBeli || 0) * qty)
                });
            }

            await tx.insert(riwayatAksi).values({
                userId: actorId,
                unitId: unit.id,
                pesan: `Transaksi POS: ${customerNameSafe || 'Pelanggan Umum'} | Total ${orderTotal}`,
                kategori: 'POS',
                link: `/finance/${slug}/history`,
                tipe: 'success',
                waktu: nowWIB()
            });

            // ── BUKU BESAR & JURNAL UMUM (AKUNTANSI) ──
            const akunKasArr = await tx.query.chartOfAccounts.findMany({
                where: and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.tipeAkun, 'ASET_LANCAR')),
                limit: 1
            });
            const akunKas = akunKasArr[0];

            const akunPendapatanArr = await tx.query.chartOfAccounts.findMany({
                where: and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.tipeAkun, 'PENDAPATAN')),
                limit: 1
            });
            const akunPendapatan = akunPendapatanArr[0];

            if (akunKas && akunPendapatan && orderTotal > 0) {
                // Header Jurnal
                const [jurnalResult] = await tx.insert(journalEntries).values({
                    unitId: unit.id,
                    userId: String(actorId),
                    tanggal: nowWIB(),
                    nomorJurnal: `JRN-POS-${orderNumber}`,
                    referensi: orderNumber,
                    memo: `Pendapatan POS ${customerNameSafe || 'Umum'}`,
                    sourceType: 'POS',
                    sourceId: String(orderId),
                    totalDebit: String(orderTotal),
                    totalKredit: String(orderTotal),
                    status: 'POSTED',
                    createdAt: nowWIB()
                });
                
                const journalId = jurnalResult.insertId;

                // Line 1: Debit Kas
                await tx.insert(journalEntryLines).values({
                    journalId: journalId,
                    coaId: akunKas.id,
                    keterangan: `Penerimaan Kas - ${orderNumber}`,
                    debit: String(orderTotal),
                    kredit: '0'
                });

                // Line 2: Kredit Pendapatan
                await tx.insert(journalEntryLines).values({
                    journalId: journalId,
                    coaId: akunPendapatan.id,
                    keterangan: `Pendapatan Penjualan - ${orderNumber}`,
                    debit: '0',
                    kredit: String(orderTotal)
                });
            }
        });

        // Hapus cache dashboard — biar data langsung muncul
        try {
            const dashboardKeys = await redis.keys(`finance_dash_v4:*:${slug}:*`);
            if (dashboardKeys.length > 0) {
                await redis.del(...dashboardKeys);
                log.pos.debug({ count: dashboardKeys.length, slug }, 'POS: Cache dashboard cleared');
            }
            const historyKeys = await redis.keys(`history_v3:*:${slug}:*`);
            if (historyKeys.length > 0) await redis.del(...historyKeys);
            
            // Invalidate Product cache so stock updates are visible immediately
            const productKeys = await redis.keys(`cache:products_page_v4:${slug}:*`);
            if (productKeys.length > 0) await redis.del(...productKeys);
        } catch (cacheErr) {
            log.pos.warn({ err: cacheErr.message }, 'POS: Cache invalidation failed');
        }

        // Kirim sinyal Pusher (real-time reload & notifikasi)
        try {
            pusherServer.trigger(`finance-${slug}`, 'stats-updated', {
                triggerRefresh: true
            });

            pusherServer.trigger(`finance-${slug}`, 'pos-transaction-new', {
                orderNumber: orderNumber,
                customerName: customerNameSafe || 'Walk-in Customer'
            });

            pusherServer.trigger(`finance-${slug}`, 'pos-stock-updated', {
                triggerRefresh: true
            });

            pusherServer.trigger('channel-bizgrow', 'notif-baru', {
                id: Date.now(),
                unitId: Number(unitId),
                pesan: `Transaksi POS selesai #${orderNumber}. Total: Rp ${Number(orderTotal).toLocaleString('id-ID')}`,
                kategori: 'POS',
                tipe: 'success',
                waktu: new Date()
            });
        } catch (signalErr) {
            log.pos.warn({ err: signalErr.message }, 'POS: Pusher trigger failed');
        }

        return json({ success: true, message: "Transaksi berhasil!", orderNumber: orderNumber, orderId: finalOrderId });

    } catch (err) {
        log.pos.error({ err: err.message }, 'POS transaction error');
        return json({ error: err.message }, { status: 500 });
    }
}
