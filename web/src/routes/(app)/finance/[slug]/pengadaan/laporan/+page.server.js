import { db } from '$lib/server/drizzle';
import { laporanPembelian } from '$lib/server/laporanPembelian';
import { konteksHalaman } from '$lib/server/pengadaanAksi';
import { todayStrWIB } from '$lib/server/dateUtils';

const formatTanggal = /^\d{4}-\d{2}-\d{2}$/;

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const hariIni = todayStrWIB();
	const dariInput = event.url.searchParams.get('dari') || '';
	const sampaiInput = event.url.searchParams.get('sampai') || '';
	const dari = formatTanggal.test(dariInput) ? dariInput : `${hariIni.slice(0, 7)}-01`;
	const sampai = formatTanggal.test(sampaiInput) ? sampaiInput : hariIni;

	const { ringkasan, perSupplier, perProduk } = await laporanPembelian(db, unit.id, dari, sampai);

	return { unit, dari, sampai, ringkasan, perSupplier, perProduk };
}
