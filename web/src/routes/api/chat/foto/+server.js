/**
 * POST /api/chat/foto  (multipart: file, unit?, pesan?)
 * Baca foto nota/struk/bukti transfer/catatan kas dengan model visi → kartu transaksi untuk chat AI.
 * Web (cookie) dan Android (Bearer). Foto yang sama dibaca ulang dari cache (0 token).
 */
import { json } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { cekKuotaAI } from '$lib/server/rateLimit';
import { unitBisnis, chartOfAccounts } from '$lib/server/schema';
import { siapkanGambar, bacaFoto, keTransaksi, susunBalasan } from '$lib/server/aiFoto';
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
	if (!(file instanceof File) || !file.size) return json({ reply: 'Foto tidak ditemukan. Pilih foto nota/struk dulu ya kak.' }, { status: 400 });
	const slug = String(form.get('unit') || '').trim();
	const unitIdForm = Number(form.get('unitId'));
	const pesan = String(form.get('pesan') || '').trim().slice(0, 300);

	const units = await db.select({ id: unitBisnis.id, slug: unitBisnis.slug, nama: unitBisnis.namaUnit }).from(unitBisnis).where(eq(unitBisnis.userId, userId));
	const unit = slug ? units.find((u) => u.slug === slug) : unitIdForm > 0 ? units.find((u) => u.id === unitIdForm) : units.length === 1 ? units[0] : null;
	if ((slug || unitIdForm > 0) && !unit) return json({ reply: 'Unit bisnis tidak ditemukan.' }, { status: 404 });

	let gambar;
	try {
		gambar = await siapkanGambar(Buffer.from(await file.arrayBuffer()));
	} catch (e) {
		return json({ reply: `${e instanceof Error ? e.message : 'Gambar tidak valid'}.` }, { status: 400 });
	}

	const kuota = await cekKuotaAI(userId);
	if (!kuota.allowed) return json({ reply: kuota.pesan }, { status: 429 });

	try {
		const { hasil, dariCache } = await bacaFoto(gambar, { pertanyaan: pesan });
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
			foto: { jenis: hasil.jenis, toko: hasil.toko, total: hasil.total, items: hasil.items.length, terbaca: hasil.terbaca, dariCache }
		});
	} catch (err) {
		log.ai.error({ err }, '[Foto] gagal');
		if (err instanceof GroqError) return json({ reply: `${pesanGalatAI(err)} 🙏`, aiError: true });
		return json({ reply: err instanceof Error && /Foto/.test(err.message) ? err.message : 'Foto gagal diproses. Coba lagi ya kak.' }, { status: 500 });
	}
}
