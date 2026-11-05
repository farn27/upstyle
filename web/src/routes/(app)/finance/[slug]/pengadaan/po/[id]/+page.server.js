import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { aksiAman, barisQtyDariForm, idAngka, konteksHalaman } from '$lib/server/pengadaanAksi';
import {
	batalPO,
	bayarTagihan,
	buatTagihan,
	daftarAkunKas,
	detailPO,
	hapusPO,
	kirimPO,
	returBarang,
	terimaBarang,
	tutupPO
} from '$lib/server/pengadaan';
import { todayStrWIB } from '$lib/server/dateUtils';
import { tambahHari } from '$lib/pengadaan';

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const detail = await detailPO(db, unit.id, idAngka(event.params.id));
	if (!detail) throw error(404, 'Purchase Order tidak ditemukan');
	const hariIni = todayStrWIB();
	return {
		unit,
		...JSON.parse(JSON.stringify(detail)),
		akunKas: await daftarAkunKas(db, unit.id),
		hariIni,
		jatuhTempoAwal: tambahHari(hariIni, detail.supplier?.termPembayaran ?? 30)
	};
}

/** Satu aksi PO: cek akses, baca form, jalankan, balas pesan */
const aksi = (/** @type {(ctx: any, poId: number, form: FormData) => Promise<any>} */ fn, /** @type {string} */ pesan) => async (/** @type {any} */ event) =>
	aksiAman(async () => {
		const { ctx } = await konteksHalaman(event);
		await fn(ctx, idAngka(event.params.id), await event.request.formData());
		return { pesan };
	});

export const actions = {
	kirim: aksi((ctx, id) => kirimPO(db, ctx, id), 'PO dikirim. Sekarang menunggu barang dari supplier.'),
	batal: aksi((ctx, id, f) => batalPO(db, ctx, id, String(f.get('alasan') || '')), 'PO dibatalkan.'),
	tutup: aksi((ctx, id) => tutupPO(db, ctx, id), 'PO ditutup. Sisa barang tidak ditunggu lagi.'),
	hapus: async (event) =>
		aksiAman(async () => {
			const { unit, ctx } = await konteksHalaman(event);
			await hapusPO(db, ctx, idAngka(event.params.id));
			throw redirect(303, `/finance/${unit.slug}/pengadaan/po`);
		}),
	terima: aksi(
		(ctx, id, f) =>
			terimaBarang(db, ctx, id, {
				tanggal: String(f.get('tanggal') || '') || undefined,
				noSuratJalan: String(f.get('noSuratJalan') || ''),
				catatan: String(f.get('catatan') || ''),
				items: /** @type {any} */ (barisQtyDariForm(f))
			}),
		'Penerimaan disimpan. Stok produk sudah bertambah.'
	),
	tagih: aksi(
		(ctx, id, f) =>
			buatTagihan(db, ctx, id, {
				nomorFaktur: f.get('nomorFaktur'),
				tanggal: f.get('tanggal'),
				jatuhTempo: f.get('jatuhTempo'),
				items: barisQtyDariForm(f)
			}),
		'Tagihan dicatat sebagai hutang dan masuk jurnal.'
	),
	bayar: aksi(
		(ctx, _id, f) => bayarTagihan(db, ctx, idAngka(String(f.get('payableId'))), { nominal: f.get('nominal'), kasCoaId: f.get('kasCoaId') }),
		'Pembayaran dicatat.'
	),
	retur: aksi(
		(ctx, id, f) =>
			returBarang(db, ctx, id, {
				tanggal: String(f.get('tanggal') || '') || undefined,
				alasan: f.get('alasan'),
				items: barisQtyDariForm(f)
			}),
		'Retur dicatat. Stok produk sudah dikurangi.'
	)
};
