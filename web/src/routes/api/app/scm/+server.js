import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { suppliers, purchaseOrders, purchaseOrderItems, products, transaksi, riwayatAksi, stockLogs } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import crypto from 'crypto';

// 1. GET: Ambil suppliers dan purchase orders untuk unitId
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        // Fetch suppliers
        const suppliersList = await db.query.suppliers.findMany({
            where: eq(suppliers.unitId, Number(unitId)),
            orderBy: [desc(suppliers.id)]
        });

        // Fetch purchase orders with items and supplier info
        const poList = await db.query.purchaseOrders.findMany({
            where: eq(purchaseOrders.unitId, Number(unitId)),
            orderBy: [desc(purchaseOrders.id)],
            with: {
                supplier: true,
                items: {
                    with: {
                        product: true
                    }
                }
            }
        });

        // Map suppliers
        const mappedSuppliers = suppliersList.map(s => {
            let details = { contactName: '', phone: '', email: '', category: '', address: '' };
            if (s.kontak) {
                try {
                    details = JSON.parse(s.kontak);
                } catch {
                    details.phone = s.kontak; // fallback
                }
            }
            return {
                id: String(s.id),
                name: s.namaSupplier,
                contactName: details.contactName || '',
                phone: details.phone || '',
                email: details.email || '',
                category: details.category || '',
                address: details.address || ''
            };
        });

        // Map POs (flat structure for mobile app)
        const mappedPos = poList.map(po => {
            const item = po.items?.[0] || null;
            return {
                id: String(po.id),
                poNumber: po.poNumber,
                supplierId: String(po.supplierId),
                supplierName: po.supplier?.namaSupplier || 'Supplier',
                productName: item?.product?.nama || 'Produk',
                productId: item?.productId || '',
                qty: item?.qtyOrdered || 0,
                unitCost: Number(item?.unitPrice || 0),
                totalAmount: Number(po.totalAmount || 0),
                date: po.createdAt ? new Date(po.createdAt).getTime() : Date.now(),
                status: po.status || 'DRAFT'
            };
        });

        return json({
            success: true,
            data: {
                suppliers: mappedSuppliers,
                purchaseOrders: mappedPos
            }
        });

    } catch (err) {
        log.scm.error({ err }, 'API GET SCM ERROR');
        return json({ success: false, message: "Gagal mengambil data SCM: " + err.message }, { status: 500 });
    }
}

// 2. POST: Tambah Supplier atau Purchase Order (PO)
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action; // 'create-supplier' or 'create-po'

        if (action === 'create-supplier') {
            const { name, contactName, phone, email, category, address, unitId } = body.supplier;

            if (!name || !unitId) {
                return json({ success: false, message: "Nama supplier dan unitId wajib diisi" }, { status: 400 });
            }

            const kontakJson = JSON.stringify({ contactName, phone, email, category, address });

            const [result] = await db.insert(suppliers).values({
                unitId: Number(unitId), namaSupplier: name, kontak: kontakJson
            });

            // Log action
            await db.insert(riwayatAksi).values({
                userId, unitId: Number(unitId), pesan: `Supplier Baru Terdaftar: ${name}`, kategori: 'SCM', tipe: 'success'
            });

            return json({ success: true, message: "Supplier berhasil disimpan", id: String(result.insertId) });
        }

        if (action === 'create-po') {
            const { poNumber, supplierId, productId, qty, unitCost, totalAmount, unitId } = body.po;

            if (!poNumber || !supplierId || !productId || !unitId) {
                return json({ success: false, message: "poNumber, supplierId, productId, unitId wajib diisi" }, { status: 400 });
            }

            let newPoId = null;

            await db.transaction(async (tx) => {
                // Get product name
                const prod = await tx.query.products.findFirst({
                    where: eq(products.id, productId)
                });
                const prodName = prod ? prod.nama : 'Produk';

                // Get next 7 days for expected_date
                const expectedDate = new Date();
                expectedDate.setDate(expectedDate.getDate() + 7);

                // Insert PO
                const [poResult] = await tx.insert(purchaseOrders).values({
                    poNumber, unitId: Number(unitId), supplierId: Number(supplierId), createdBy: userId, status: 'DRAFT', totalAmount: String(totalAmount || 0), expectedDate: expectedDate
                });
                
                newPoId = poResult.insertId;

                // Insert PO item
                await tx.insert(purchaseOrderItems).values({
                    poId: newPoId, productId: productId, qtyOrdered: Number(qty || 0), unitPrice: String(unitCost || 0), totalPrice: String(totalAmount || 0)
                });

                // Log action
                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: Number(unitId),
                    pesan: `PO Baru Dibuat: ${poNumber} untuk ${prodName} (${qty} unit)`,
                    kategori: 'SCM',
                    tipe: 'info'
                });
            });

            return json({ success: true, message: "Purchase Order berhasil dibuat", id: String(newPoId) });
        }

        return json({ success: false, message: "Aksi tidak dikenali" }, { status: 400 });

    } catch (err) {
        log.scm.error({ err }, 'API POST SCM ERROR');
        return json({ success: false, message: "Gagal membuat SCM: " + err.message }, { status: 500 });
    }
}

// 3. PUT: Update Status PO (DRAFT -> SENT -> RECEIVED)
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { poId, status, unitId } = body;

        if (!poId || !status) {
            return json({ success: false, message: "poId dan status wajib diisi" }, { status: 400 });
        }

        const po = await db.query.purchaseOrders.findFirst({
            where: eq(purchaseOrders.id, Number(poId)),
            with: {
                supplier: true,
                items: {
                    with: {
                        product: true
                    }
                }
            }
        });

        if (!po) return json({ success: false, message: "Purchase Order tidak ditemukan" }, { status: 404 });

        await db.transaction(async (tx) => {
            await tx.update(purchaseOrders)
                .set({ status: status })
                .where(eq(purchaseOrders.id, Number(poId)));

            const item = po.items?.[0] || null;

            if (status === 'RECEIVED' && item && item.product) {
                const qtyStr = String(item.qtyOrdered);
                const currentStock = Number(item.product.stok || 0);
                const addQty = Number(item.qtyOrdered || 0);
                const newStock = currentStock + addQty;

                // 1. Update product stock
                await tx.update(products)
                    .set({ stok: newStock })
                    .where(eq(products.id, item.productId));

                // 2. Insert stock log
                await tx.insert(stockLogs).values({
                    id: crypto.randomUUID(),
                    productId: item.productId,
                    userId: String(userId),
                    unitId: Number(unitId || po.unitId),
                    stokAwal: currentStock,
                    perubahan: addQty,
                    stokAkhir: newStock,
                    alasan: 'RESTOCK',
                    keterangan: `Stok bertambah via penerimaan PO ${po.poNumber}`
                });

                // 3. Record expense in transaksi
                await tx.insert(transaksi).values({
                    unitId: Number(unitId || po.unitId), userId: userId, kategoriTrx: 'KELUAR', nominal: String(po.totalAmount), totalHarga: String(po.totalAmount), keterangan: `Pembelian Bahan Baku PO ${po.poNumber} dari ${po.supplier?.namaSupplier || 'Supplier'}`
                });

                // 4. Log action
                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: Number(unitId || po.unitId),
                    pesan: `PO ${po.poNumber} DITERIMA. Stok ${item.product.nama} +${qtyStr} unit. Pengeluaran dicatat: Rp ${String(po.totalAmount)}`,
                    kategori: 'SCM',
                    tipe: 'success'
                });
            } else if (status === 'SENT') {
                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: Number(unitId || po.unitId),
                    pesan: `PO ${po.poNumber} dikirim ke supplier ${po.supplier?.namaSupplier || 'Supplier'}`,
                    kategori: 'SCM',
                    tipe: 'info'
                });
            }
        });

        return json({ success: true, message: `Status PO berhasil diubah menjadi ${status}` });
    } catch (err) {
        log.scm.error({ err }, 'API PUT SCM ERROR');
        return json({ success: false, message: "Gagal memperbarui PO: " + err.message }, { status: 500 });
    }
}

// 4. DELETE: Hapus Supplier
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const supplierId = url.searchParams.get('supplierId');
    const unitId = url.searchParams.get('unitId');
    if (!supplierId || !unitId) return json({ success: false, message: "supplierId dan unitId wajib diisi" }, { status: 400 });

    try {
        const supplierData = await db.query.suppliers.findFirst({
            where: eq(suppliers.id, Number(supplierId))
        });
        if (!supplierData) return json({ success: false, message: "Supplier tidak ditemukan" }, { status: 404 });

        await db.delete(suppliers).where(and(eq(suppliers.id, Number(supplierId)), eq(suppliers.unitId, Number(unitId))));

        // Save log
        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId), pesan: `Supplier Dihapus: ${supplierData.namaSupplier}`, kategori: 'SCM', tipe: 'warning'
        });

        return json({ success: true, message: "Supplier berhasil dihapus" });
    } catch (err) {
        log.scm.error({ err }, 'API DELETE SCM ERROR');
        return json({ success: false, message: "Gagal menghapus supplier" }, { status: 500 });
    }
}
