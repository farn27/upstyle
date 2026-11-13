/**
 * Open bill kasir (pesan dulu, bayar nanti) — hanya untuk unit yang memakai profil kasir dengan open bill.
 * GET  → daftar bill terbuka
 * POST { aksi: 'simpan' | 'kirim' | 'batal' | 'pindah', ... }
 */
import { json, isHttpError } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { ambilProfilPos } from '$lib/server/posProfil';
import { daftarBillTerbuka, simpanBill, kirimBillKeDapur, batalkanBill, pindahMeja } from '$lib/server/posResto';
import { PosError } from '$lib/server/posCheckout';
import { pesanAman } from '$lib/server/pesanAman';
import { triggerEvent } from '$lib/server/pusher';
import { log } from '$lib/server/logger';

/** @param {any} cookies @param {any} params @param {any} locals */
async function siapkan(cookies, params, locals) {
	const akses = await resolvePosUnitAccess(cookies, params, locals);
	const profil = await ambilProfilPos(db, Number(akses.unit.id));
	if (!profil || !profil.pengaturan.openBill) throw new PosError('Open bill belum aktif untuk unit ini. Aktifkan di Kelola Kasir.', 403);
	return { akses, profil, unitId: Number(akses.unit.id) };
}

/** @param {unknown} err */
function galat(err) {
	if (err instanceof PosError) return json({ error: pesanAman(err) }, { status: err.status });
	if (isHttpError(err)) return json({ error: err.body?.message || 'Akses ditolak' }, { status: err.status });
	log.pos.error({ err: err instanceof Error ? err.message : String(err) }, 'POS bill error');
	return json({ error: 'Bill gagal diproses. Coba lagi.' }, { status: 500 });
}

export async function GET({ cookies, params, locals }) {
	try {
		const { unitId } = await siapkan(cookies, params, locals);
		return json({ bill: await daftarBillTerbuka(db, unitId) });
	} catch (err) {
		return galat(err);
	}
}

export async function POST({ request, cookies, params, locals }) {
	try {
		const { akses, profil, unitId } = await siapkan(cookies, params, locals);
		/** @type {any} */
		const b = await request.json().catch(() => ({}));
		const p = profil.pengaturan;
		const mejaSah = p.meja.aktif ? p.meja.daftar.map((m) => m.kode) : null;
		const oleh = akses.isStaff ? akses.staffSession?.full_name || 'Kasir' : 'Pemilik';
		/** @type {any} */
		let hasil;
		switch (b.aksi) {
			case 'simpan':
			case 'kirim': {
				const bill = await simpanBill(
					db,
					unitId,
					{ id: b.id || null, versi: b.versi ?? null, meja: b.meja, nama: b.nama, jenisPesanan: b.jenisPesanan, jumlahTamu: b.jumlahTamu, items: b.items, isian: b.isian, catatan: b.catatan },
					{ oleh, mejaSah }
				);
				hasil = { bill, tiket: 0 };
				if (b.aksi === 'kirim' && p.dapur.aktif) hasil = await kirimBillKeDapur(db, unitId, bill.id, { stasiun: p.dapur.stasiun, labelBill: p.labelBill });
				break;
			}
			case 'pindah':
				hasil = { bill: await pindahMeja(db, unitId, Number(b.id), String(b.meja || ''), mejaSah) };
				break;
			case 'batal':
				await batalkanBill(db, unitId, Number(b.id));
				hasil = { ok: true };
				break;
			default:
				return json({ error: 'Aksi tidak dikenal' }, { status: 400 });
		}
		await triggerEvent(`unit-${unitId}`, 'pos-bill', { aksi: b.aksi, tiket: hasil.tiket || 0 }).catch(() => {});
		return json(hasil);
	} catch (err) {
		return galat(err);
	}
}
