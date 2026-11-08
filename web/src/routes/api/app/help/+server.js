import { json } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';
import { db } from '$lib/server/drizzle';
import { users, riwayatAksi } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, emailBase } from '$lib/server/email';
import { env } from '$env/dynamic/private';

import { FAQS, PANDUAN, TROUBLESHOOT, KATEGORI_FAQ } from '$lib/bantuanKonten.js';

/** Satu sumber konten dengan halaman web /help. id = urutan FAQ (1-based). */
const HELP_ITEMS = FAQS.map((f, i) => ({ id: i + 1, q: f.q, a: f.a, category: f.cat }));
const LABEL_TROUBLESHOOT = { pos: 'Kasir & hardware', finance: 'Keuangan', sync: 'Sinkronisasi marketplace' };

export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	try {
		const query = (url.searchParams.get('q') || '').trim().toLowerCase();
		const category = (url.searchParams.get('category') || '').trim();

		let items = HELP_ITEMS;
		if (category) {
			items = items.filter(item => item.category === category);
		}
		if (query) {
			items = items.filter(item => item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query));
		}

		return apiSuccess({
			items, total: items.length,
			kategori: Object.entries(KATEGORI_FAQ).map(([id, label]) => ({ id, label })),
			panduan: PANDUAN.map((g) => ({ title: g.title, desc: g.desc, steps: g.steps })),
			troubleshoot: Object.entries(TROUBLESHOOT).map(([id, daftar]) => ({
				id, label: LABEL_TROUBLESHOOT[id] || id, masalah: daftar.map((m) => ({ problem: m.problem, solution: m.solution }))
			}))
		}, 'OK');
	} catch (err) {
		log.api.error({ err }, 'GET /api/app/help');
		return apiError('Gagal memuat pusat bantuan', 500);
	}
}

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	try {
		const body = await request.json();

		// Kirim tiket ke tim Bizgrow (email ke SUPPORT_EMAIL) — dulu tombolnya selalu gagal "belum tersedia"
		if (body?.action === 'ticket') {
			const judul = String(body?.title || '').trim().slice(0, 150);
			const isi = String(body?.description || '').trim().slice(0, 4000);
			if (!judul || !isi) return apiError('Judul dan deskripsi wajib diisi', 422);
			const tujuan = env.SUPPORT_EMAIL;
			if (!tujuan) return apiError('Saluran dukungan belum diaktifkan oleh admin (SUPPORT_EMAIL belum diatur)', 503);
			const pengguna = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { username: true, email: true } });
			const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
			const kirim = await sendEmail({
				to: tujuan,
				subject: `[Tiket ${String(body?.priority || 'medium').toUpperCase()}] ${judul}`,
				html: emailBase(`<h3>${esc(judul)}</h3><p style="white-space:pre-wrap">${esc(isi)}</p><hr><p style="color:#64748b;font-size:13px">Dari: ${esc(pengguna?.username || '?')} &lt;${esc(pengguna?.email || '?')}&gt; • unit #${Number(body?.unitId) || '-'}${body?.screenContext ? ' • layar ' + esc(body.screenContext) : ''}</p>`, 'Tiket dukungan')
			});
			if (!kirim.success) return apiError('Tiket belum terkirim, coba lagi nanti', 502);
			if (Number(body?.unitId)) {
				await db.insert(riwayatAksi).values({ userId, unitId: Number(body.unitId), pesan: `Tiket dukungan dikirim: ${judul}`, kategori: 'BANTUAN', tipe: 'info' }).catch(() => {});
			}
			return apiSuccess({ message: 'Tiket terkirim' }, 'Tiket terkirim ke tim Bizgrow');
		}

		// Ulasan aplikasi (bintang + komentar) → diteruskan ke tim lewat email dukungan
		if (body?.action === 'review') {
			const bintang = Math.round(Number(body?.rating));
			if (!(bintang >= 1 && bintang <= 5)) return apiError('Rating harus 1-5', 422);
			const komentar = String(body?.comment || '').trim().slice(0, 1500);
			log.api.info({ userId, bintang, komentar }, 'help.review');
			const tujuan = env.SUPPORT_EMAIL;
			if (tujuan) {
				const pengguna = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { username: true, email: true } });
				const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
				await sendEmail({ to: tujuan, subject: `[Ulasan ${bintang}★] dari ${pengguna?.username || 'pengguna'}`, html: emailBase(`<h3>Ulasan ${bintang} dari 5</h3><p style="white-space:pre-wrap">${esc(komentar || '(tanpa komentar)')}</p><hr><p style="color:#64748b;font-size:13px">${esc(pengguna?.username || '?')} &lt;${esc(pengguna?.email || '?')}&gt;</p>`, 'Ulasan aplikasi') }).catch(() => {});
			}
			return apiSuccess({ message: 'Terima kasih atas ulasanmu' }, 'Ulasan diterima');
		}

		const id = Number(body?.id);
		const feedback = String(body?.feedback || '').trim();
		const rating = body?.rating;

		if (!id || !feedback) {
			return apiError('id dan feedback wajib diisi', 422);
		}
		if (rating === undefined || rating === null) {
			return apiError('rating wajib diisi', 422);
		}

		const item = HELP_ITEMS.find(entry => entry.id === id);
		if (!item) {
			return apiError('Item bantuan tidak ditemukan', 404);
		}

		log.api.info(
			{ userId, id, feedback, rating },
			'help.feedback'
		);

		return apiSuccess({ message: 'Feedback bantuan berhasil dikirim' }, 'OK');
	} catch (err) {
		log.api.error({ err }, 'POST /api/app/help/feedback');
		return apiError('Gagal mengirim feedback bantuan', 500);
	}
}
