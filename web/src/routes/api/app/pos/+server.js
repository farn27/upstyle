import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posOrders, posOrderItems, posCustomers, products, productVariants, transaksi, riwayatAksi, chartOfAccounts, journalEntries, journalEntryLines, posShifts, posPayments, unitBisnis, employees, vouchers } from '$lib/server/schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { hashEmployeePassword } from '$lib/server/employeePassword';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import crypto from 'crypto';
import { triggerEvent } from '$lib/server/pusher';
import { redis } from '$lib/server/redis';
import { unitMilikUser, karyawanMilikUser } from '$lib/server/apiUnitGuard';
import { decryptField } from '$lib/server/encryption';
import { bisaDijual } from '$lib/jenisProduk';
import { nowWIB, todayStrWIB } from '$lib/server/dateUtils';
import { getActivePosFeatures } from '$lib/posFeatures';
import { hitungPpn, tarifPpnAktif, pastikanAkunPpnKeluaran } from '$lib/server/pajak';

/** Error checkout yang pesannya aman ditampilkan */
class CheckoutError extends Error {
    /** @param {string} message @param {number} [status] */
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// 1. GET: Ambil list order POS dan customer POS untuk unitId
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        const action = url.searchParams.get('action');

        if (action === 'shifts') {
            const shiftsList = await db.query.posShifts.findMany({
                where: and(
                    eq(posShifts.unitId, Number(unitId))
                ),
                orderBy: [desc(posShifts.id)],
                limit: 20
            });
            // Map to mobile-compatible format
            const mapped = shiftsList.map(s => ({
                id: s.id,
                unitId: s.unitId,
                userId: s.userId || 0,
                waktuBuka: s.waktuBuka || '',
                waktuTutup: s.waktuTutup || null,
                modalAwal: Number(s.modalAwal || 0),
                kasAkhir: Number(s.kasAkhir || 0),
                kasAkhirAktual: Number(s.kasAkhirAktual || 0),
                selisih: Number(s.selisih || 0),
                status: s.status || 'CLOSED',
                catatan: s.catatan || null
            }));
            return json({ success: true, data: mapped });
        }

        if (action === 'queue') {
            // Get current queue (orders with queue numbers that are not completed)
            const queueList = await db.select()
                .from(posOrders)
                .where(and(
                    eq(posOrders.unitId, Number(unitId)),
                    isNull(posOrders.queueNumber).not(),
                    sql`${posOrders.fulfillmentStatus} != 'COMPLETED'`
                ))
                .orderBy(posOrders.queueNumber);

            return json({ 
                success: true, 
                data: { 
                    queue: queueList.map(q => ({
                        id: q.id,
                        orderNumber: q.orderNumber,
                        queueNumber: q.queueNumber,
                        fulfillmentStatus: q.fulfillmentStatus,
                        orderType: q.orderType,
                        tableNumber: q.tableNumber,
                        total: Number(q.total || 0),
                        createdAt: q.createdAt
                    }))
                } 
            });
        }

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
            tanggal: o.createdAt ? new Date(o.createdAt).getTime() : Date.now(),
            orderType: o.orderType || 'TAKEAWAY',
            tableNumber: o.tableNumber || '',
            queueNumber: o.queueNumber || '',
            fulfillmentStatus: o.fulfillmentStatus || 'COMPLETED',
            notes: o.notes || '',
            amountPaid: Number(o.amountPaid || 0),
            changeAmount: Number(o.changeAmount || 0),
            voucherCode: o.voucherCode || ''
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
        log.pos.error({ err }, 'API GET POS ERROR');
        return json({ success: false, message: "Gagal mengambil data POS" }, { status: 500 });
    }
}

// 2. POST: Checkout Order POS atau Tambah Customer POS
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        // ─── Zod validation per action ──────────────────────────────────────────
        if (action === 'create-customer') {
            const schema = z.object({
                action: z.literal('create-customer'),
                customer: z.object({
                    namaCustomer: z.string().min(1, 'Nama customer wajib diisi').max(150),
                    email: z.string().email().optional().or(z.literal('')),
                    telepon: z.string().optional(),
                    unitId: z.coerce.number().int().positive(),
                })
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input customer tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }

        if (action === 'checkout') {
            const schema = z.object({
                action: z.literal('checkout'),
                order: z.object({
                    orderNumber: z.string().optional(),
                    unitId: z.coerce.number().int().positive(),
                    customerId: z.number().nullable().optional(),
                    subtotal: z.coerce.number().min(0),
                    total: z.coerce.number().min(0),
                    paymentMethod: z.string().default('CASH'),
                    orderType: z.string().default('TAKEAWAY'),
                    tableNumber: z.string().optional(),
                    queueNumber: z.string().optional(),
                    notes: z.string().optional(),
                    amountPaid: z.coerce.number().optional(),
                    changeAmount: z.coerce.number().optional(),
                    voucherCode: z.string().optional(),
                    kenaiPpn: z.boolean().optional(),
                    ppnInklusif: z.boolean().optional(),
                    payments: z.array(z.object({
                        method: z.string(),
                        amount: z.coerce.number()
                    })).optional(),
                    items: z.array(z.object({
                        productId: z.string().min(1),
                        productName: z.string().min(1),
                        qty: z.coerce.number().int().positive(),
                        price: z.coerce.number().min(0),
                        variantId: z.string().nullable().optional(),
                    })).min(1, 'Minimal 1 item'),
                })
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input checkout tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }
        if (action === 'open-shift') {
            const schema = z.object({
                action: z.literal('open-shift'),
                shift: z.object({
                    unitId: z.coerce.number().int().positive(),
                    modalAwal: z.coerce.number().min(0)
                })
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input open shift tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }

        if (action === 'close-shift') {
            const schema = z.object({
                action: z.literal('close-shift'),
                shift: z.object({
                    unitId: z.coerce.number().int().positive(),
                    shiftId: z.coerce.number().int().positive(),
                    kasAkhirAktual: z.coerce.number().min(0)
                })
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input close shift tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }

        if (action === 'verify-pin') {
            const schema = z.object({
                action: z.literal('verify-pin'),
                employeeId: z.coerce.number().int().positive(),
                pin: z.string().length(4, 'PIN harus 4 digit')
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input PIN tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }

        if (action === 'update-queue-status') {
            const schema = z.object({
                action: z.literal('update-queue-status'),
                orderId: z.coerce.number().int().positive(),
                status: z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED'])
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input queue status tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }
        // ────────────────────────────────────────────────────────────────────────

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
            const { orderNumber, unitId, customerId, paymentMethod, items, orderType, tableNumber, queueNumber, notes, amountPaid, changeAmount, voucherCode, payments, diskon, kenaiPpn, ppnInklusif } = body.order;

            let finalOrderId = null;
            let subtotal = 0;
            let diskonFinal = 0;
            let total = 0;
            let ppnJual = 0;
            let ppnTarif = 0;
            try {
            await db.transaction(async (tx) => {
                const unitRow = await tx.query.unitBisnis.findFirst({ where: eq(unitBisnis.id, Number(unitId)) });
                if (!unitRow) throw new CheckoutError('Unit tidak ditemukan', 404);
                const fitur = getActivePosFeatures(unitRow.kategori, unitRow.posFeatureOverride);

                // 0. Normalisasi item: produk HARUS milik unit ini, harga dari database
                //    (harga kiriman app hanya dipakai kalau fitur harga bebas/openPrice aktif)
                if (!Array.isArray(items) || items.length === 0) throw new CheckoutError('Keranjang kosong');
                const baris = [];
                for (const item of items) {
                    const qty = Number(item?.qty);
                    if (!Number.isInteger(qty) || qty <= 0 || qty > 1_000_000) {
                        throw new CheckoutError(`Jumlah ${item?.productName || 'barang'} tidak valid`);
                    }
                    const prod = await tx.query.products.findFirst({
                        where: and(eq(products.id, String(item?.productId ?? '')), eq(products.unitId, Number(unitId)))
                    });
                    if (!prod) throw new CheckoutError(`Produk ${item?.productName || ''} tidak ditemukan di unit ini`.trim(), 404);
                    if (!bisaDijual(prod.jenis)) {
                        throw new CheckoutError(`${prod.nama} bukan barang jual (bahan/kemasan/perlengkapan)`);
                    }
                    let harga = Number(prod.hargaJual || 0);
                    let namaItem = item.productName || prod.nama;
                    if (item.variantId) {
                        const varian = await tx.query.productVariants.findFirst({
                            where: and(eq(productVariants.id, String(item.variantId)), eq(productVariants.productId, prod.id))
                        });
                        if (!varian) throw new CheckoutError(`Varian ${prod.nama} tidak ditemukan`, 404);
                        // pos_order_items.variant_id bertipe INT sedangkan ID varian UUID → simpan namanya saja
                        if (!String(namaItem).includes(varian.namaVariasi)) namaItem = `${prod.nama} - ${varian.namaVariasi}`;
                        if (Number(varian.hargaJual) > 0) harga = Number(varian.hargaJual);
                    }
                    if (fitur.openPrice) {
                        const hargaApp = Number(item.price);
                        if (Number.isFinite(hargaApp) && hargaApp >= 0) harga = hargaApp;
                    }
                    baris.push({ prod, qty, harga, nama: namaItem });
                }
                subtotal = baris.reduce((sum, b) => sum + b.harga * b.qty, 0);

                /** @type {number | null} */
                let voucherIdDipakai = null;
                // Diskon: voucher divalidasi di server; diskon manual hanya kalau fiturnya aktif.
                // (Pemakaian voucher dicatat lewat action 'use-voucher' di /api/app/pos/vouchers.)
                if (voucherCode) {
                    const v = await tx.query.vouchers.findFirst({
                        where: and(eq(vouchers.code, String(voucherCode)), eq(vouchers.unitId, Number(unitId)))
                    });
                    const hariIni = todayStrWIB();
                    if (v && v.isActive && v.validFrom <= hariIni && v.validUntil >= hariIni && subtotal >= Number(v.minPurchase || 0)) {
                        diskonFinal = v.discountType === 'PERCENTAGE'
                            ? Math.floor(subtotal * (Number(v.discountValue) / 100))
                            : Number(v.discountValue);
                        voucherIdDipakai = v.id;
                    }
                } else if (fitur.manualDiscount) {
                    diskonFinal = Number(diskon || 0);
                }
                if (!Number.isFinite(diskonFinal) || diskonFinal < 0) diskonFinal = 0;
                diskonFinal = Math.min(diskonFinal, subtotal);
                total = subtotal - diskonFinal;

                // PPN penjualan: tarif diambil dari pengaturan pajak unit (bukan dari kiriman app)
                if (kenaiPpn) {
                    const tarif = await tarifPpnAktif(tx, Number(unitId));
                    if (!tarif || tarif.persentase <= 0) throw new CheckoutError('Belum ada tarif PPN aktif. Atur di Pengaturan Pajak dulu.', 422);
                    const h = hitungPpn(total, tarif.persentase, ppnInklusif ? 'INCLUSIVE' : 'EXCLUSIVE');
                    ppnJual = h.ppn;
                    ppnTarif = tarif.persentase;
                    total = h.total;
                }

                // 1. Insert order (nilai resmi dihitung server)
                const [orderInsertResult] = await tx.insert(posOrders).values({
                    orderNumber: orderNumber || `POS-${unitId}-${Date.now()}`, 
                    unitId: Number(unitId), 
                    customerId: customerId || null, 
                    createdBy: userId, 
                    subtotal: String(subtotal), 
                    discount: String(diskonFinal), 
                    total: String(total), 
                    paymentMethod: paymentMethod || 'CASH', 
                    status: 'PAID',
                    orderType: orderType || 'TAKEAWAY',
                    tableNumber: tableNumber || null,
                    queueNumber: queueNumber || null,
                    fulfillmentStatus: queueNumber ? 'PENDING' : 'COMPLETED',
                    notes: [notes, ppnJual > 0 ? `PPN ${ppnTarif}% ${ppnInklusif ? '(termasuk)' : ''}: Rp ${ppnJual.toLocaleString('id-ID')}` : null].filter(Boolean).join(' | ') || null,
                    amountPaid: String(amountPaid !== undefined && amountPaid !== null ? amountPaid : total),
                    change: String(changeAmount || 0), // kolomnya bernama "change" (dulu changeAmount → tidak pernah tersimpan)
                    voucherId: voucherIdDipakai
                });

                finalOrderId = orderInsertResult.insertId;

                // Insert payments if split payment
                if (payments && Array.isArray(payments) && payments.length > 0) {
                    for (const p of payments) {
                        await tx.insert(posPayments).values({
                            orderId: finalOrderId,
                            method: p.method,
                            amount: String(p.amount)
                        });
                    }
                }

                // 2. Insert items and reduce stock
                for (const { prod, qty, harga, nama } of baris) {
                    const nominal = harga * qty;

                    // Atomik (aman untuk beberapa kasir). Penjualan offline yang disinkron belakangan tetap
                    // dicatat walau stok sudah habis — stok berhenti di 0 seperti perilaku sebelumnya.
                    await tx.update(products)
                        .set({ stok: sql`GREATEST(${products.stok} - ${qty}, 0)` })
                        .where(and(eq(products.id, prod.id), eq(products.unitId, Number(unitId))));

                    await tx.insert(posOrderItems).values({
                        orderId: finalOrderId, productId: prod.id, variantId: null, productName: nama, qty: qty, price: String(harga), total: String(nominal), costTotal: String(Number(prod.hargaBeli || 0) * qty)
                    });

                    // Save transaction
                    await tx.insert(transaksi).values({
                        userId: userId,
                        unitId: Number(unitId),
                        keterangan: `Penjualan POS: ${nama} (${qty}x)`,
                        nominal: String(nominal),
                        totalHarga: String(nominal),
                        kategoriTrx: 'MASUK',
                        metodeBayar: paymentMethod || 'CASH',
                        productId: prod.id,
                        qty: qty,
                        hppTotal: String(Number(prod.hargaBeli || 0) * qty)
                    });
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
                        unitId: Number(unitId), userId: String(userId), tanggal: todayStrWIB(), nomorJurnal: `JRN-POS-${orderNumber}`, referensi: orderNumber, memo: 'Pendapatan POS', sourceType: 'POS', sourceId: String(finalOrderId), totalDebit: String(total), totalKredit: String(total), status: 'POSTED'
                    });
                    const journalId = jurnalResult.insertId;

                    // Debit Cash
                    await tx.insert(journalEntryLines).values({
                        journalId, coaId: coaCash.id, keterangan: `Penerimaan Kas - ${orderNumber}`, debit: String(total), kredit: '0'
                    });

                    // Credit Revenue (tanpa PPN) + Credit PPN Keluaran
                    await tx.insert(journalEntryLines).values({
                        journalId, coaId: coaRevenue.id, keterangan: `Pendapatan Penjualan - ${orderNumber}`, debit: '0', kredit: String(Number(total) - ppnJual)
                    });
                    if (ppnJual > 0) {
                        const coaPpn = await pastikanAkunPpnKeluaran(tx, Number(unitId));
                        await tx.insert(journalEntryLines).values({
                            journalId, coaId: coaPpn, keterangan: `PPN Keluaran ${ppnTarif}% - ${orderNumber}`, debit: '0', kredit: String(ppnJual)
                        });
                    }
                }
            });
            } catch (e) {
                if (e instanceof CheckoutError) return json({ success: false, message: e.message }, { status: e.status });
                throw e;
            }

            const unit = await db.query.unitBisnis.findFirst({
                where: eq(unitBisnis.id, Number(unitId))
            });
            const slug = unit?.slug || '';
            if (slug) {
                const productKeys = await redis.keys(`cache:products_page_v4:${slug}:*`);
                if (productKeys.length > 0) await redis.del(...productKeys);

                // Trigger on correct unit room for web notifications
                triggerEvent(`unit-${unitId}`, 'pos-transaction', {
                    orderNumber,
                    total: Number(total),
                    unitId: Number(unitId),
                    timestamp: nowWIB()
                });
                triggerEvent(`unit-${unitId}`, 'notification', {
                    id: Date.now(),
                    unitId: Number(unitId),
                    pesan: `POS: Transaksi #${orderNumber} - Rp ${String(total)}`,
                    kategori: 'POS',
                    tipe: 'success',
                    waktu: nowWIB()
                });
            }

            return json({ success: true, message: "Transaksi berhasil diproses", id: String(finalOrderId), data: { subtotal, discount: diskonFinal, ppn: ppnJual, total } });
        }

        if (action === 'open-shift') {
            const { unitId, modalAwal } = body.shift;
            
            const [result] = await db.insert(posShifts).values({
                unitId: Number(unitId),
                userId: userId,
                waktuBuka: new Date(),
                modalAwal: String(modalAwal),
                status: 'OPEN'
            });
            
            await db.insert(riwayatAksi).values({
                userId, unitId: Number(unitId), pesan: `POS Shift dibuka. Modal: Rp ${String(modalAwal)}`, kategori: 'POS', tipe: 'success'
            });
            
            return json({ success: true, message: "Shift berhasil dibuka", data: { id: result.insertId } });
        }

        if (action === 'close-shift') {
            const { shiftId, unitId, kasAkhirAktual } = body.shift;
            
            const shift = await db.query.posShifts.findFirst({
                where: eq(posShifts.id, Number(shiftId))
            });
            
            if (!shift || !(await unitMilikUser(db, userId, shift.unitId))) {
                return json({ success: false, message: "Shift tidak ditemukan" }, { status: 404 });
            }
            
            // Optional: kalkulasi selisih di sini, atau berasumsi client/sistem telah hitung.
            // Di sini kita update saja dulu
            
            await db.update(posShifts).set({
                waktuTutup: new Date(),
                kasAkhirAktual: String(kasAkhirAktual),
                status: 'CLOSED'
            }).where(eq(posShifts.id, Number(shiftId)));
            
            await db.insert(riwayatAksi).values({
                userId, unitId: Number(unitId), pesan: `POS Shift ditutup`, kategori: 'POS', tipe: 'success'
            });
            
            return json({ success: true, message: "Shift berhasil ditutup" });
        }

        if (action === 'verify-pin') {
            const { employeeId, pin } = body;

            // Hanya karyawan di unit milik user (mencegah menebak PIN karyawan tenant lain)
            const employee = await karyawanMilikUser(db, userId, employeeId);
            if (!employee) {
                return json({ success: false, message: "Karyawan tidak ditemukan" }, { status: 404 });
            }

            // PIN disimpan terenkripsi (encryptField), sama seperti verifikasi PIN di web
            let pinBenar = false;
            try {
                pinBenar = !!employee.pin && decryptField(employee.pin, true) === String(pin ?? '');
            } catch {
                pinBenar = false;
            }
            if (!pinBenar) {
                return json({ success: false, message: "PIN salah" }, { status: 400 });
            }

            return json({
                success: true,
                message: "PIN benar",
                employee: {
                    id: employee.id,
                    fullName: employee.fullName,
                    position: employee.position,
                    role: employee.role
                }
            });
        }

        if (action === 'update-queue-status') {
            const { orderId, status } = body;

            const order = await db.query.posOrders.findFirst({
                where: eq(posOrders.id, Number(orderId))
            });

            if (!order || !(await unitMilikUser(db, userId, order.unitId))) {
                return json({ success: false, message: "Order tidak ditemukan" }, { status: 404 });
            }

            await db.update(posOrders)
                .set({ fulfillmentStatus: status })
                .where(eq(posOrders.id, Number(orderId)));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: order.unitId,
                pesan: `Status antrean order ${order.orderNumber} diubah ke ${status}`,
                kategori: 'POS',
                tipe: 'info'
            });

            return json({ success: true, message: `Status order berhasil diubah ke ${status}` });
        }

        return json({ success: false, message: "Aksi tidak dikenali" }, { status: 400 });

    } catch (err) {
        log.pos.error({ err }, 'API POST POS ERROR');
        return json({ success: false, message: "Gagal memproses POS: " + err.message }, { status: 500 });
    }
}
