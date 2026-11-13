import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, riwayatAksi } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { ambilProfilPos } from '$lib/server/posProfil';
import { ringkasFiturPos, simpanFiturPos, resetFiturPos } from '$lib/server/posKelola';

// Pengaturan fitur POS per unit — sama dengan halaman web pos/kelola/fitur.
// (unitId dicek milik user oleh guard di hooks.server.js)

/** GET ?unitId=X → { category, activeFeatures, defaultFeatures, overrides, keys } */
export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const unitId = Number(url.searchParams.get('unitId'));
	if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
	const unit = await db.query.unitBisnis.findFirst({ where: eq(unitBisnis.id, unitId) });
	if (!unit) return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });
	// profilPos: untuk aplikasi versi berikutnya (denah meja, dapur, service/PB1). Versi lama mengabaikan kolom ini.
	return json({ success: true, data: { ...ringkasFiturPos(unit), profilPos: await ambilProfilPos(db, unitId) } });
}

/** PUT { unitId, features: { posEnabled: true, barcodeScanner: false, ... } } */
export async function PUT({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	try {
		const body = await request.json();
		const unitId = Number(body?.unitId);
		if (!unitId || !body?.features || typeof body.features !== 'object') {
			return json({ success: false, message: 'unitId dan features wajib diisi' }, { status: 400 });
		}
		const data = await simpanFiturPos(db, unitId, body.features);
		if (!data) return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });
		await db.insert(riwayatAksi).values({ userId, unitId, pesan: 'Pengaturan fitur POS diperbarui', kategori: 'POS', tipe: 'info' });
		return json({ success: true, message: 'Pengaturan fitur POS disimpan', data });
	} catch (err) {
		log.api.error({ err }, 'PUT pos/features');
		return json({ success: false, message: 'Gagal menyimpan pengaturan fitur' }, { status: 500 });
	}
}

/** DELETE ?unitId=X → kembali ke default kategori usaha */
export async function DELETE({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const unitId = Number(url.searchParams.get('unitId'));
	if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
	try {
		await resetFiturPos(db, unitId);
		const unit = await db.query.unitBisnis.findFirst({ where: eq(unitBisnis.id, unitId) });
		return json({ success: true, message: 'Fitur POS kembali ke default', data: unit ? ringkasFiturPos(unit) : null });
	} catch (err) {
		log.api.error({ err }, 'DELETE pos/features');
		return json({ success: false, message: 'Gagal me-reset pengaturan fitur' }, { status: 500 });
	}
}
