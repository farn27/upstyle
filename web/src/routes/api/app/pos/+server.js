import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posOrders, posOrderItems, posCustomers, products, productVariants, transaksi, riwayatAksi, chartOfAccounts, journalEntries, journalEntryLines, posShifts, posPayments, unitBisnis, employees, vouchers } from '$lib/server/schema';
import { eq, and, desc, isNull, isNotNull, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { hashEmployeePassword } from '$lib/server/employeePassword';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import crypto from 'crypto';
import { triggerEvent } from '$lib/server/pusher';
import { redis } from '$lib/server/redis';
import { unitMilikUser, karyawanMilikUser } from '$lib/server/apiUnitGuard';
import { cocokkanPin, hashPin } from '$lib/server/pinKaryawan';
import { checkRateLimit } from '$lib/server/rateLimit';
import { bisaDijual } from '$lib/jenisProduk';
import { nowSqlWIB } from '$lib/server/dateUtils';
import { getActivePosFeatures } from '$lib/posFeatures';
import { prosesCheckoutPos, siarkanCheckoutPos, PosError } from '$lib/server/posCheckout';

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
                    isNotNull(posOrders.queueNumber),
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
                pin: z.string().regex(/^\d{4,6}$/, 'PIN harus 4–6 digit angka')
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
            const { orderNumber, unitId, customerId, paymentMethod, items, orderType, tableNumber, queueNumber, notes, amountPaid, voucherCode, payments, diskon, kenaiPpn, ppnInklusif } = body.order;

            // Unit dipastikan milik user oleh guardUnitApiApp (hooks); di sini diambil datanya saja
            const unitRow = await db.query.unitBisnis.findFirst({ where: and(eq(unitBisnis.id, Number(unitId)), eq(unitBisnis.userId, userId)) });
            if (!unitRow) return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });
            const unit = { id: unitRow.id, slug: unitRow.slug, userId: Number(unitRow.userId), kategori: unitRow.kategori, posFeatureOverride: unitRow.posFeatureOverride };

            let hasil;
            try {
                // Logika checkout sama persis dengan kasir web (lib/server/posCheckout.js)
                hasil = await prosesCheckoutPos(db, { unit, kasirPemilik: true, namaKasir: null }, {
                    items: items.map((/** @type {any} */ i) => ({
                        productId: String(i.productId),
                        variantId: i.variantId ? String(i.variantId) : null,
                        qty: Number(i.qty),
                        harga: i.price,
                        nama: i.productName
                    })),
                    customerId: customerId ? Number(customerId) : null,
                    voucherCode: voucherCode || null,
                    diskonManual: diskon,
                    paymentMethod,
                    payments: Array.isArray(payments) ? payments : null,
                    amountPaid,
                    orderType,
                    tableNumber,
                    queueNumber,
                    notes,
                    kenaiPpn: Boolean(kenaiPpn),
                    ppnInklusif: Boolean(ppnInklusif),
                    orderNumber,
                    // Penjualan offline yang baru tersinkron tetap dicatat walau stok sudah habis (stok berhenti di 0)
                    izinkanStokKurang: true
                });
            } catch (e) {
                if (e instanceof PosError) return json({ success: false, message: e.message }, { status: e.status });
                // order_number unik: kiriman ulang dari antrean offline tidak boleh tercatat dua kali
                if (/** @type {any} */ (e)?.code === 'ER_DUP_ENTRY' || /Duplicate entry/i.test(String(/** @type {any} */ (e)?.message))) {
                    return json({ success: false, message: 'Transaksi dengan nomor ini sudah tercatat' }, { status: 409 });
                }
                throw e;
            }

            await siarkanCheckoutPos(unit, hasil);

            return json({
                success: true,
                message: "Transaksi berhasil diproses",
                id: String(hasil.orderId),
                data: { orderNumber: hasil.orderNumber, subtotal: hasil.subtotal, discount: hasil.discount, ppn: hasil.ppn, total: hasil.total, paid: hasil.paid, change: hasil.change }
            });
        }

        if (action === 'open-shift') {
            const { unitId, modalAwal } = body.shift;
            
            // Satu shift terbuka per unit (web & mobile memakai shift yang sama)
            const [terbuka] = await db.select({ id: posShifts.id }).from(posShifts)
                .where(and(eq(posShifts.unitId, Number(unitId)), eq(posShifts.status, 'OPEN'))).limit(1);
            if (terbuka) {
                return json({ success: true, message: "Shift sudah terbuka", data: { id: terbuka.id } });
            }
            const [result] = await db.insert(posShifts).values({
                unitId: Number(unitId),
                userId: userId,
                waktuBuka: nowSqlWIB(), // dulu new Date() (UTC) padahal kolom lain WIB
                modalAwal: String(modalAwal),
                kasAkhir: String(modalAwal), // kas laci yang diharapkan mulai dari modal awal
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
            
            if (shift.status !== 'OPEN') {
                return json({ success: false, message: "Shift sudah ditutup" }, { status: 409 });
            }
            // Selisih = kas aktual − kas yang diharapkan (modal + penjualan tunai ± setor/tarik), sama seperti web
            const selisih = Number(kasAkhirAktual) - Number(shift.kasAkhir || 0);
            await db.update(posShifts).set({
                waktuTutup: nowSqlWIB(),
                kasAkhirAktual: String(kasAkhirAktual),
                selisih: String(selisih),
                status: 'CLOSED'
            }).where(eq(posShifts.id, Number(shiftId)));
            
            await db.insert(riwayatAksi).values({
                userId, unitId: shift.unitId, pesan: `POS Shift ditutup${selisih !== 0 ? `. Selisih kas: Rp ${selisih.toLocaleString('id-ID')}` : ''}`, kategori: 'POS', tipe: selisih !== 0 ? 'info' : 'success'
            });
            
            return json({ success: true, message: "Shift berhasil ditutup", data: { selisih, kasDiharapkan: Number(shift.kasAkhir || 0) } });
        }

        if (action === 'verify-pin') {
            const { employeeId, pin } = body;

            // Hanya karyawan di unit milik user (mencegah menebak PIN karyawan tenant lain)
            const employee = await karyawanMilikUser(db, userId, employeeId);
            if (!employee) {
                return json({ success: false, message: "Karyawan tidak ditemukan" }, { status: 404 });
            }

            // Cegah tebak-tebakan PIN: 5 percobaan per 15 menit per karyawan
            const rlPin = await checkRateLimit({ key: String(employee.id), prefix: 'rl:pos:pin', limit: 5, windowSec: 15 * 60 });
            if (!rlPin.allowed) {
                return json({ success: false, message: "Terlalu banyak percobaan PIN. Coba lagi nanti." }, { status: 429 });
            }
            const { cocok, perluHashUlang } = await cocokkanPin(employee.pin, pin);
            if (!cocok) {
                return json({ success: false, message: employee.pin ? "PIN salah" : "PIN karyawan belum diatur" }, { status: 400 });
            }
            if (perluHashUlang) {
                await db.update(employees).set({ pin: await hashPin(String(pin)) }).where(eq(employees.id, employee.id)).catch(() => {});
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
