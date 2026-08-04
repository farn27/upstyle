import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posOrders, posOrderItems, posCustomers, products, transaksi, riwayatAksi, abcCategories, chartOfAccounts, journalEntries, journalEntryLines, posShifts, posPayments, unitBisnis, employees, posQueue } from '$lib/server/schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { hashEmployeePassword } from '$lib/server/employeePassword';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import crypto from 'crypto';
import { triggerEvent } from '$lib/server/pusher';
import { redis } from '$lib/server/redis';
import { nowWIB } from '$lib/server/dateUtils';

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
                    eq(posShifts.unitId, Number(unitId)),
                    eq(posShifts.status, 'OPEN')
                ),
                orderBy: [desc(posShifts.id)]
            });
            return json({ success: true, data: { shifts: shiftsList } });
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
            const { orderNumber, unitId, customerId, subtotal, total, paymentMethod, items, orderType, tableNumber, queueNumber, notes, amountPaid, changeAmount, voucherCode, payments } = body.order;

            let finalOrderId = null;
            await db.transaction(async (tx) => {
                // 1. Insert order
                const [orderInsertResult] = await tx.insert(posOrders).values({
                    orderNumber: orderNumber || `POS-${unitId}-${Date.now()}`, 
                    unitId: Number(unitId), 
                    customerId: customerId || null, 
                    createdBy: userId, 
                    subtotal: String(subtotal || 0), 
                    discount: '0', 
                    total: String(total || 0), 
                    paymentMethod: paymentMethod || 'CASH', 
                    status: 'PAID',
                    orderType: orderType || 'TAKEAWAY',
                    tableNumber: tableNumber || null,
                    queueNumber: queueNumber || null,
                    fulfillmentStatus: queueNumber ? 'PENDING' : 'COMPLETED',
                    notes: notes || null,
                    amountPaid: String(amountPaid !== undefined ? amountPaid : (total || 0)),
                    changeAmount: String(changeAmount || 0),
                    voucherCode: voucherCode || null
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

                triggerEvent(`finance-${slug}`, 'stats-updated', { message: `POS order ${orderNumber}` });
                triggerEvent('finance-channel', 'new-transaction', { message: `POS order ${orderNumber}` });
                triggerEvent('channel-bizgrow', 'notif-baru', {
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
            
            if (!shift) {
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

            const employee = await db.query.employees.findFirst({
                where: eq(employees.id, Number(employeeId))
            });

            if (!employee) {
                return json({ success: false, message: "Karyawan tidak ditemukan" }, { status: 404 });
            }

            // Verify PIN - assume PIN stored as hash
            const pinHash = await hashEmployeePassword(pin);
            const isValidPin = pinHash === employee.pin; // You might need to adjust this based on your PIN storage method

            if (!isValidPin) {
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

            if (!order) {
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
