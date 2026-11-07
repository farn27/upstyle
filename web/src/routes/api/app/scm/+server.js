import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { suppliers, purchaseOrders, purchaseOrderItems, products, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { batalPO, hapusSupplier, kirimPO, PengadaanError, terimaSemuaDariMobile } from '$lib/server/pengadaan';

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

        const data = {
            suppliers: mappedSuppliers,
            purchaseOrders: mappedPos.map(po => ({
                ...po,
                expectedDate: po.expectedDate ? new Date(po.expectedDate).getTime() : null,
                createdAt: po.date,
                items: (po.items || []).map(it => ({
                    productId: it.productId,
                    qtyOrdered: Number(it.qtyOrdered || 0),
                    unitPrice: Number(it.unitPrice || 0),
                    totalPrice: Number(it.totalPrice || 0)
                }))
            }))
        };

        return json({ success: true, data });

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

            // Supplier & barang HARUS milik unit ini (dulu produk unit lain bisa masuk PO,
            // lalu saat diterima stok unit lain yang bertambah)
            const [supplierRow] = await db.select({ id: suppliers.id }).from(suppliers)
                .where(and(eq(suppliers.id, Number(supplierId)), eq(suppliers.unitId, Number(unitId)))).limit(1);
            if (!supplierRow) return json({ success: false, message: "Supplier tidak ditemukan di unit ini" }, { status: 404 });
            const prod = await db.query.products.findFirst({
                where: and(eq(products.id, String(productId)), eq(products.unitId, Number(unitId)))
            });
            if (!prod) return json({ success: false, message: "Barang tidak ditemukan di unit ini" }, { status: 404 });
            const jumlah = Number(qty);
            const harga = Number(unitCost);
            if (!Number.isInteger(jumlah) || jumlah <= 0 || !(harga >= 0)) {
                return json({ success: false, message: "Jumlah harus bilangan bulat > 0 dan harga tidak boleh negatif" }, { status: 422 });
            }
            const total = jumlah * harga;

            let newPoId = null;

            await db.transaction(async (tx) => {
                const prodName = prod.nama;

                // Get next 7 days for expected_date
                const expectedDate = new Date();
                expectedDate.setDate(expectedDate.getDate() + 7);

                // Insert PO
                const [poResult] = await tx.insert(purchaseOrders).values({
                    poNumber, unitId: Number(unitId), supplierId: Number(supplierId), createdBy: userId, status: 'DRAFT', totalAmount: String(total), expectedDate: expectedDate
                });
                
                newPoId = poResult.insertId;

                // Insert PO item
                await tx.insert(purchaseOrderItems).values({
                    poId: newPoId, productId: prod.id, qtyOrdered: jumlah, unitPrice: String(harga), totalPrice: String(total)
                });

                // Log action
                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: Number(unitId),
                    pesan: `PO Baru Dibuat: ${poNumber} untuk ${prodName} (${jumlah} unit)`,
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

        const [po] = await db.select({ id: purchaseOrders.id, unitId: purchaseOrders.unitId })
            .from(purchaseOrders).where(eq(purchaseOrders.id, Number(poId))).limit(1);

        if (!po || !(await unitMilikUser(db, userId, po.unitId))) return json({ success: false, message: "Purchase Order tidak ditemukan" }, { status: 404 });

        // Logika yang sama dengan modul Pengadaan di web, supaya stok tidak bisa masuk dua kali
        const ctx = { unitId: po.unitId, userId };
        if (status === 'RECEIVED') await terimaSemuaDariMobile(db, ctx, po.id);
        else if (status === 'SENT') await kirimPO(db, ctx, po.id);
        else if (status === 'CANCELLED') await batalPO(db, ctx, po.id);
        else return json({ success: false, message: "Status PO tidak dikenali" }, { status: 422 });

        return json({ success: true, message: `Status PO berhasil diubah menjadi ${status}` });
    } catch (err) {
        if (err instanceof PengadaanError) return json({ success: false, message: err.message }, { status: err.status });
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
        if (!supplierData || !(await unitMilikUser(db, userId, supplierData.unitId))) return json({ success: false, message: "Supplier tidak ditemukan" }, { status: 404 });

        // Menolak supplier yang punya PO: FK cascade akan ikut menghapus riwayat pembelian
        await hapusSupplier(db, { unitId: supplierData.unitId, userId }, supplierData.id);

        // Save log
        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId), pesan: `Supplier Dihapus: ${supplierData.namaSupplier}`, kategori: 'SCM', tipe: 'info'
        });

        return json({ success: true, message: "Supplier berhasil dihapus" });
    } catch (err) {
        if (err instanceof PengadaanError) return json({ success: false, message: err.message }, { status: err.status });
        log.scm.error({ err }, 'API DELETE SCM ERROR');
        return json({ success: false, message: "Gagal menghapus supplier" }, { status: 500 });
    }
}
