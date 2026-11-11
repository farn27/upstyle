import { json } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { log } from '$lib/server/logger';
import { purchaseOrders } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import {
	PengadaanError,
	detailPO,
	daftarAkunKas,
	kirimPO,
	batalPO,
	tutupPO,
	terimaBarang,
	buatTagihan,
	bayarTagihan,
	returBarang
} from '$lib/server/pengadaan';

/** PO milik user, atau null */
async function poMilikUser(userId, poId) {
	const n = Number(poId);
	if (!Number.isInteger(n) || n <= 0) return null;
	const [po] = await db.select({ id: purchaseOrders.id, unitId: purchaseOrders.unitId }).from(purchaseOrders).where(eq(purchaseOrders.id, n)).limit(1);
	if (!po || !(await unitMilikUser(db, userId, po.unitId))) return null;
	return po;
}

const angka = (v) => (v == null || v === '' ? 0 : Number(v));
const rapi = (obj) => JSON.parse(JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));

/** GET /api/app/scm/po?poId=X — detail PO lengkap (barang, penerimaan, tagihan, retur) + akun kas untuk bayar */
export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const po = await poMilikUser(userId, url.searchParams.get('poId'));
	if (!po) return json({ success: false, message: 'Purchase Order tidak ditemukan' }, { status: 404 });
	try {
		const d = await detailPO(db, po.unitId, po.id);
		if (!d) return json({ success: false, message: 'Purchase Order tidak ditemukan' }, { status: 404 });
		const akunKas = await daftarAkunKas(db, po.unitId);
		return json({
			success: true,
			data: rapi({
				id: d.po.id,
				poNumber: d.po.poNumber,
				status: d.po.status,
				supplierName: d.supplier?.namaSupplier || '',
				supplierPhone: d.supplier?.detail?.phone || '',
				notes: d.po.notes || '',
				diskon: angka(d.po.diskon),
				ongkir: angka(d.po.ongkir),
				ppnPersen: angka(d.po.ppnPersen),
				totalAmount: angka(d.po.totalAmount),
				expectedDate: d.po.expectedDate ? String(d.po.expectedDate).slice(0, 10) : null,
				items: d.items.map((i) => ({
					id: i.id, productId: i.productId, namaProduk: i.namaProduk || i.productId, sku: i.sku || '',
					qtyOrdered: angka(i.qtyOrdered), qtyReceived: angka(i.qtyReceived), qtyInvoiced: angka(i.qtyInvoiced), qtyReturned: angka(i.qtyReturned),
					unitPrice: angka(i.unitPrice), totalPrice: angka(i.totalPrice)
				})),
				penerimaan: d.penerimaan.map((p) => ({ id: p.id, nomor: p.nomor || p.nomorPenerimaan || `GR-${p.id}`, tanggal: p.tanggal ? String(p.tanggal).slice(0, 10) : '', noSuratJalan: p.noSuratJalan || '', ringkasan: p.ringkasan || '' })),
				tagihan: d.tagihan.map((t) => ({
					id: t.id, nomorFaktur: t.nomorFaktur, tanggal: t.tanggal ? String(t.tanggal).slice(0, 10) : '', jatuhTempo: t.jatuhTempo ? String(t.jatuhTempo).slice(0, 10) : '',
					total: angka(t.total), payableId: t.payableId, nominalHutang: angka(t.nominalHutang), sudahDibayar: angka(t.sudahDibayar), statusHutang: t.statusHutang
				})),
				retur: d.retur.map((r) => ({ id: r.id, nomor: r.nomor || `RT-${r.id}`, tanggal: r.tanggal ? String(r.tanggal).slice(0, 10) : '', alasan: r.alasan || '', ringkasan: r.ringkasan || '' })),
				akunKas: akunKas.map((a) => ({ id: a.id, kodeAkun: a.kodeAkun, namaAkun: a.namaAkun }))
			})
		});
	} catch (err) {
		log.scm.error({ err }, 'API GET SCM PO');
		return json({ success: false, message: 'Gagal memuat PO' }, { status: 500 });
	}
}

/**
 * POST /api/app/scm/po  { poId, action: kirim|batal|tutup|terima|tagih|bayar|retur, ... }
 * Memakai fungsi yang sama dengan halaman web, jadi aturan stok/hutang/jurnal identik.
 */
export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	try {
		const body = await request.json();
		const po = await poMilikUser(userId, body?.poId);
		if (!po) return json({ success: false, message: 'Purchase Order tidak ditemukan' }, { status: 404 });
		const ctx = { unitId: po.unitId, userId };
		const items = Array.isArray(body.items) ? body.items : [];

		switch (body.action) {
			case 'kirim': await kirimPO(db, ctx, po.id); break;
			case 'batal': await batalPO(db, ctx, po.id, String(body.alasan || '')); break;
			case 'tutup': await tutupPO(db, ctx, po.id); break;
			case 'terima':
				await terimaBarang(db, ctx, po.id, { tanggal: body.tanggal || undefined, noSuratJalan: String(body.noSuratJalan || ''), catatan: String(body.catatan || ''), items });
				break;
			case 'tagih':
				await buatTagihan(db, ctx, po.id, { nomorFaktur: body.nomorFaktur, tanggal: body.tanggal, jatuhTempo: body.jatuhTempo, items });
				break;
			case 'bayar':
				await bayarTagihan(db, ctx, Number(body.payableId), { nominal: body.nominal, kasCoaId: body.kasCoaId });
				break;
			case 'retur':
				await returBarang(db, ctx, po.id, { tanggal: body.tanggal || undefined, alasan: body.alasan, items });
				break;
			default:
				return json({ success: false, message: 'Aksi tidak dikenali' }, { status: 422 });
		}
		return json({ success: true, message: 'Berhasil' });
	} catch (err) {
		if (err instanceof PengadaanError) return json({ success: false, message: pesanAman(err) }, { status: err.status });
		log.scm.error({ err }, 'API POST SCM PO');
		return json({ success: false, message: 'Gagal memproses PO: ' + pesanAman(err) }, { status: 500 });
	}
}
