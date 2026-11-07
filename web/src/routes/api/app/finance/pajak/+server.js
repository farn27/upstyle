import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { ringkasPpn, tarifPpnAktif } from '$lib/server/pajak';
import { thisMonthWIB } from '$lib/server/dateUtils';

const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');

/**
 * GET /api/app/finance/pajak?unitId=X&tahun=2026
 * Rekap PPN (keluaran, masukan, kurang/lebih bayar) per bulan + tarif PPN aktif.
 */
export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const unitId = Number(url.searchParams.get('unitId'));
	if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
	const tahun = parseInt(url.searchParams.get('tahun') || String(thisMonthWIB().year));
	if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) return json({ success: false, message: 'tahun tidak valid' }, { status: 400 });

	try {
		const bulan = [];
		let totalKeluaran = 0;
		let totalMasukan = 0;
		for (let b = 1; b <= 12; b++) {
			const akhir = new Date(Date.UTC(tahun, b, 0)).getUTCDate();
			const r = await ringkasPpn(db, unitId, `${tahun}-${pad(b)}-01`, `${tahun}-${pad(b)}-${pad(akhir)}`);
			bulan.push({ bulan: b, ...r });
			totalKeluaran += r.keluaran;
			totalMasukan += r.masukan;
		}
		const tarif = await tarifPpnAktif(db, unitId);
		return json({
			success: true,
			data: { tahun, tarifPpn: tarif, bulan, totalKeluaran, totalMasukan, totalKurangBayar: totalKeluaran - totalMasukan }
		});
	} catch (err) {
		log.finance.error({ err }, 'GET finance/pajak');
		return json({ success: false, message: 'Gagal memuat rekap pajak' }, { status: 500 });
	}
}
