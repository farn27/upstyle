import { json } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { db } from '$lib/server/drizzle';
import { transaksi, unitBisnis, products, productVariants, riwayatAksi, posCustomers, posOrders, posOrderItems, chartOfAccounts, journalEntries, journalEntryLines, posPayments, vouchers } from '$lib/server/schema';
import { log } from '$lib/server/logger.js';
import { eq, and, or, sql, gte, lt, isNull } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { pusherServer } from '$lib/server/pusher';
import { nowWIB, todayStrWIB } from '$lib/server/dateUtils';
import { bisaDijual } from '$lib/jenisProduk';
import { getActivePosFeatures } from '$lib/posFeatures';

/** Error POS yang pesannya aman ditampilkan ke kasir */
class PosError extends Error {
    /** @param {string} message @param {number} [status] */
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

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
        let posUnitId = null;
        let posOrderTotal = 0;
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

            if (!unit) throw new PosError('Unit tidak ditemukan', 404);

            const isOwner = ownerUserId && Number(unit.userId) === Number(ownerUserId);
            const isStaff = staffSession && Number(unit.id) === Number(staffSession.unit_id);
            if (!isOwner && !isStaff) throw new PosError('Akses ditolak untuk melakukan transaksi POS', 403);
            posUnitId = unit.id;
            // Kolom user_id / created_by / cashier_id mereferensikan tabel users (pemilik), BUKAN karyawan.
            // Dulu ID karyawan dimasukkan ke sini → gagal foreign key atau tercatat atas nama user lain.
            const pemilikId = Number(unit.userId);
            const namaKasir = isStaff && !isOwner ? (staffSession?.full_name || 'Kasir') : null;

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
            const fitur = getActivePosFeatures(unit.kategori, unit.posFeatureOverride);

            // Keranjang dinormalisasi di server: produk HARUS milik unit ini dan harga diambil dari database.
            // Harga kiriman kasir hanya dipakai kalau fitur "harga bebas" (openPrice) aktif untuk unit ini.
            if (!Array.isArray(cart) || cart.length === 0) throw new PosError('Keranjang kosong');
            const barisKeranjang = [];
            for (const item of cart) {
                const qty = Number(item?.qty);
                if (!Number.isInteger(qty) || qty <= 0 || qty > 1_000_000) {
                    throw new PosError(`Jumlah ${item?.nama || 'barang'} tidak valid`);
                }
                const produk = await tx.query.products.findFirst({
                    where: and(eq(products.id, String(item?.id ?? '')), eq(products.unitId, unit.id), isNull(products.deletedAt))
                });
                if (!produk) throw new PosError(`Produk ${item?.nama || ''} tidak ditemukan di unit ini`.trim(), 404);
                if (!bisaDijual(produk.jenis)) throw new PosError(`${produk.nama} bukan barang jual (bahan/kemasan/perlengkapan)`);

                let hargaDb = Number(produk.hargaJual || 0);
                let namaItem = produk.nama;
                if (item.variantId) {
                    const varian = await tx.query.productVariants.findFirst({
                        where: and(eq(productVariants.id, String(item.variantId)), eq(productVariants.productId, produk.id))
                    });
                    if (!varian) throw new PosError(`Varian ${produk.nama} tidak ditemukan`, 404);
                    // pos_order_items.variant_id bertipe INT sedangkan ID varian UUID → simpan namanya saja
                    namaItem = `${produk.nama} - ${varian.namaVariasi}`;
                    if (Number(varian.hargaJual) > 0) hargaDb = Number(varian.hargaJual);
                }

                let unitPrice = hargaDb;
                if (fitur.openPrice) {
                    const hargaKasir = Number(item.harga_jual ?? item.harga);
                    if (Number.isFinite(hargaKasir) && hargaKasir >= 0) unitPrice = hargaKasir;
                }
                barisKeranjang.push({ produk, qty, unitPrice, namaItem });
            }
            const orderSubtotal = barisKeranjang.reduce((sum, b) => sum + b.unitPrice * b.qty, 0);
            
            let finalDiscountValue = 0;
            if (voucher_id) {
                const voucher = await tx.query.vouchers.findFirst({
                    where: and(eq(vouchers.id, Number(voucher_id)), eq(vouchers.unitId, unit.id))
                });
                if (voucher && voucher.isActive) {
                    const today = todayStrWIB();
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
            } else if (fitur.manualDiscount && discount_value) {
                // Diskon manual hanya kalau fitur diskon manual aktif untuk unit ini
                finalDiscountValue = Number(discount_value);
            }
            if (!Number.isFinite(finalDiscountValue) || finalDiscountValue < 0) finalDiscountValue = 0;
            finalDiscountValue = Math.min(finalDiscountValue, orderSubtotal);

            const orderTotal = Math.max(0, orderSubtotal - finalDiscountValue);
            posOrderTotal = orderTotal;

            const [orderInsertResult] = await tx.insert(posOrders).values({
                orderNumber,
                unitId: unit.id,
                customerId,
                createdBy: pemilikId,
                cashierId: isOwner ? pemilikId : null,
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
            
            if (voucher_id && finalDiscountValue > 0) {
                // Pemakaian voucher dinaikkan secara atomik: gagal kalau kuota sudah habis (dua kasir bersamaan)
                const [pakai] = await tx.update(vouchers)
                    .set({ currentUsage: sql`current_usage + 1` })
                    .where(and(
                        eq(vouchers.id, Number(voucher_id)),
                        eq(vouchers.unitId, unit.id),
                        or(eq(vouchers.maxUsage, 0), lt(vouchers.currentUsage, vouchers.maxUsage))
                    ));
                if (!pakai?.affectedRows) throw new PosError('Kuota voucher sudah habis', 409);
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

            for (const { produk, qty, unitPrice, namaItem } of barisKeranjang) {
                const nominal = unitPrice * qty;

                // Kurangi stok secara atomik: gagal kalau stok kurang (aman untuk dua kasir bersamaan)
                const [hasilStok] = await tx.update(products)
                    .set({ stok: sql`${products.stok} - ${qty}` })
                    .where(and(eq(products.id, produk.id), eq(products.unitId, unit.id), gte(products.stok, qty)));
                if (!hasilStok?.affectedRows) {
                    const [sisa] = await tx.select({ stok: products.stok }).from(products).where(eq(products.id, produk.id));
                    throw new PosError(`Stok ${produk.nama} tidak mencukupi! (Sisa: ${sisa?.stok ?? 0})`, 409);
                }

                await tx.insert(posOrderItems).values({
                    orderId: orderId,
                    productId: String(produk.id),
                    variantId: null,
                    productName: namaItem,
                    sku: produk.sku || null,
                    qty: qty,
                    price: String(unitPrice),
                    total: String(nominal),
                    costTotal: String(Number(produk.hargaBeli || 0) * qty),
                    createdAt: nowWIB()
                });

                await tx.insert(transaksi).values({
                    userId: pemilikId,
                    unitId: unit.id,
                    tanggal: nowWIB(),
                    keterangan: `Penjualan ${produk.nama} (${qty}x)`,
                    nominal: String(nominal),
                    totalHarga: String(nominal),
                    kategoriTrx: 'MASUK',
                    metodeBayar: payment_method?.toUpperCase() || 'CASH',
                    productId: produk.id,
                    qty,
                    hppTotal: String(Number(produk.hargaBeli || 0) * qty)
                });
            }

            await tx.insert(riwayatAksi).values({
                userId: pemilikId,
                unitId: unit.id,
                pesan: `Transaksi POS: ${customerNameSafe || 'Pelanggan Umum'} | Total ${orderTotal}${namaKasir ? ` | Kasir: ${namaKasir}` : ''}`,
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
                    userId: pemilikId,
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
            pusherServer.trigger(`unit-${posUnitId}`, 'stats-updated', {
                triggerRefresh: true
            });

            pusherServer.trigger(`unit-${posUnitId}`, 'pos-transaction', {
                orderNumber: orderNumber,
                customerName: customerNameSafe || 'Walk-in Customer'
            });

            pusherServer.trigger(`unit-${posUnitId}`, 'stock-updated', {
                triggerRefresh: true
            });

            pusherServer.trigger(`unit-${posUnitId}`, 'notification', {
                id: Date.now(),
                unitId: Number(posUnitId),
                pesan: `Transaksi POS selesai #${orderNumber}. Total: Rp ${Number(posOrderTotal).toLocaleString('id-ID')}`,
                kategori: 'POS',
                tipe: 'success',
                waktu: new Date()
            });
        } catch (signalErr) {
            log.pos.warn({ err: signalErr.message }, 'POS: Pusher trigger failed');
        }

        return json({ success: true, message: "Transaksi berhasil!", orderNumber: orderNumber, orderId: finalOrderId, total: posOrderTotal });

    } catch (err) {
        if (err instanceof PosError) return json({ error: err.message }, { status: err.status });
        log.pos.error({ err: err.message }, 'POS transaction error');
        return json({ error: 'Transaksi gagal diproses. Coba lagi.' }, { status: 500 });
    }
}
