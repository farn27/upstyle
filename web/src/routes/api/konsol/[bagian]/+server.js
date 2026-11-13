/**
 * GET /api/konsol/:bagian — data Ruang Kendali (khusus superadmin, selain itu 404).
 * bagian: orbit | denyut | neuron | tenant | unit?id= | riset?unit=&mulai=&akhir= | unit-daftar | jejak
 */
import { json } from '@sveltejs/kit';
import { cekApiSuperadmin } from '$lib/server/konsol/akses';
import { ringkasan, kesehatan, pemakaianAI, tenant, detailUnit, riset, daftarUnit, jejak, tanggalSah, tglWIB } from '$lib/server/konsol/data';
import { log } from '$lib/server/logger';
import { catatLog } from '$lib/server/telemetri';
import { unitRisetDiizinkan } from '$lib/server/konsol/akses';

/** @type {Record<string, (url: URL) => Promise<any>>} */
const BAGIAN = {
	orbit: () => ringkasan(),
	denyut: () => kesehatan(),
	neuron: () => pemakaianAI(),
	tenant: () => tenant(),
	unit: async (url) => {
		const id = Number(url.searchParams.get('id'));
		return id > 0 ? await detailUnit(id) : null;
	},
	'unit-daftar': () => daftarUnit(),
	riset: async (url) => {
		const id = Number(url.searchParams.get('unit'));
		const mulai = url.searchParams.get('mulai') || tglWIB(-30);
		const akhir = url.searchParams.get('akhir') || tglWIB(1);
		if (!(id > 0) || !tanggalSah(mulai) || !tanggalSah(akhir) || mulai >= akhir) return { galat: 'Pilih unit dan periode yang valid (mulai < akhir).' };
		if (!unitRisetDiizinkan(id)) return { galat: 'Unit ini belum menyetujui pemeriksaan data (tidak ada di KONSOL_RISET_UNIT_IDS).' };
		return await riset(id, mulai, akhir);
	},
	jejak: () => jejak()
};

export async function GET({ params, url, locals, cookies }) {
	const { tolak, u } = await cekApiSuperadmin(locals, cookies);
	if (tolak) return tolak;
	const fn = BAGIAN[params.bagian];
	if (!fn) return json({ message: 'Bagian tidak dikenal' }, { status: 404 });
	try {
		const data = await fn(url);
		// Akses ke data per unit selalu tercatat di Jejak (Kode Etik Akses Data)
		if (params.bagian === 'riset' && data && !data.galat) {
			await catatLog({ level: 'audit', sumber: 'konsol', pesan: `Menjalankan Lembar G untuk unit #${url.searchParams.get('unit')} (${url.searchParams.get('mulai')} s.d. ${url.searchParams.get('akhir')})`, userId: u.id });
		} else if (params.bagian === 'unit' && data) {
			await catatLog({ level: 'audit', sumber: 'konsol', pesan: `Melihat detail unit #${url.searchParams.get('id')}`, userId: u.id });
		}
		if (data == null) return json({ message: 'Tidak ditemukan' }, { status: 404 });
		return json(data, { headers: { 'cache-control': 'no-store' } });
	} catch (e) {
		log.api.error({ err: e, bagian: params.bagian }, '[Konsol] gagal memuat data');
		return json({ message: e instanceof Error ? e.message : 'Gagal memuat data' }, { status: 500 });
	}
}
