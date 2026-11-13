/**
 * POST /api/chat/foto  (multipart: file?, teks?, unit|unitId?, pesan?)
 * Baca foto nota/struk/bukti transfer/catatan kas → kartu transaksi untuk chat AI.
 *  1. Ada model visi di akun Groq → gambar dibaca langsung.
 *  2. Tidak ada → balas { perluOcr: true }; klien membaca teks di perangkat (Tesseract di browser,
 *     ML Kit di Android — gratis) lalu mengirim ulang field `teks` → dirapikan model teks kecil.
 * Web (cookie) dan Android (Bearer). Foto/teks yang sama dibaca ulang dari cache (0 token).
 */
import { json } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { cekKuotaAI } from '$lib/server/rateLimit';
import { unitBisnis, chartOfAccounts } from '$lib/server/schema';
import { siapkanGambar, bacaFoto, bacaTeksOcr, keTransaksi, susunBalasan, VisiTidakTersedia } from '$lib/server/aiFoto';
import { GroqError, pesanGalatAI } from '$lib/server/groq';
import { kalender } from '$lib/server/chatKonteks';
import { log } from '$lib/server/logger';

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ reply: 'Sesi tidak valid, silakan login ulang ya kak.' }, { status: 401 });

	/** @type {FormData} */
	let form;
	try {
		form = await request.formData();
	} catch {
		return json({ reply: 'Format unggahan tidak valid.' }, { status: 400 });
	}
	const file = form.get('file');
	const teksOcr = String(form.get('teks') || '').trim();
	const adaFile = file instanceof File && file.size > 0;
	if (!adaFile && !teksOcr) return json({ reply: 'Foto tidak ditemukan. Pilih foto nota/struk dulu ya kak.' }, { status: 400 });
	const slug = String(form.get('unit') || '').trim();
	const unitIdForm = Number(form.get('unitId'));
	const pesan = String(form.get('pesan') || '').trim().slice(0, 300);

	const units = await db.select({ id: unitBisnis.id, slug: unitBisnis.slug, nama: unitBisnis.namaUnit }).from(unitBisnis).where(eq(unitBisnis.userId, userId));
	const unit = slug ? units.find((u) => u.slug === slug) : unitIdForm > 0 ? units.find((u) => u.id === unitIdForm) : units.length === 1 ? units[0] : null;
	if ((slug || unitIdForm > 0) && !unit) return json({ reply: 'Unit bisnis tidak ditemukan.' }, { status: 404 });

	/** @type {Buffer | null} */
	let gambar = null;
	if (adaFile && !teksOcr) {
		try {
			gambar = await siapkanGambar(Buffer.from(await /** @type {File} */ (file).arrayBuffer()));
		} catch (e) {
			return json({ reply: `${e instanceof Error ? e.message : 'Gambar tidak valid'}.` }, { status: 400 });
		}
	}

	const kuota = await cekKuotaAI(userId);
	if (!kuota.allowed) return json({ reply: kuota.pesan }, { status: 429 });

	try {
		let baca;
		try {
			baca = gambar ? await bacaFoto(gambar, { pertanyaan: pesan }) : await bacaTeksOcr(teksOcr, { pertanyaan: pesan });
		} catch (e) {
			// Akun Groq tanpa model visi → minta klien membaca teks di perangkat (OCR), lalu kirim ulang
			if (e instanceof VisiTidakTersedia) return json({ perluOcr: true, reply: '' });
			throw e;
		}
		const { hasil, dariCache, sumber } = baca;
		const coa = unit
			? await db
					.select({ id: chartOfAccounts.id, kodeAkun: chartOfAccounts.kodeAkun, namaAkun: chartOfAccounts.namaAkun, tipeAkun: chartOfAccounts.tipeAkun, deskripsi: chartOfAccounts.deskripsi })
					.from(chartOfAccounts)
					.where(and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.isActive, 1)))
					.orderBy(asc(chartOfAccounts.kodeAkun))
			: [];
		const kartu = unit ? keTransaksi(hasil, coa, kalender().hariIni) : [];
		let reply = susunBalasan(hasil, kartu);
		if (!unit && (hasil.total || hasil.transaksi.length)) reply += '\n\nPilih unit bisnis dulu di atas kolom chat supaya transaksinya bisa dicatat.';
		return json({
			reply,
			transactionPreviews: kartu.length ? kartu : null,
			suggestions: kartu.length ? ['Lihat riwayat transaksi', 'Pengeluaran terbesar bulan ini'] : ['Cara foto nota yang jelas'],
			intent: `foto:${hasil.jenis}`,
			foto: { jenis: hasil.jenis, toko: hasil.toko, total: hasil.total, items: hasil.items.length, terbaca: hasil.terbaca, dariCache, sumber }
		});
	} catch (err) {
		log.ai.error({ err }, '[Foto] gagal');
		if (err instanceof GroqError) return json({ reply: `${pesanGalatAI(err)} 🙏`, aiError: true });
		return json({ reply: err instanceof Error && /foto/i.test(err.message) ? err.message : 'Foto gagal diproses. Coba lagi ya kak.' }, { status: 500 });
	}
}
