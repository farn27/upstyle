/**
 * POST /api/konsol/masuk  { kode }  — verifikasi dua langkah Ruang Kendali.
 * Berhasil → cookie sesi konsol (httpOnly, SameSite=Strict, 8 jam), jejak audit, email pemberitahuan.
 * 5 kali salah → dikunci 15 menit.
 */
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { anggotaTim, samarkanEmail } from '$lib/server/konsol/akses';
import { periksaKode, sisaKunci, catatGagal, hapusGagal, buatSesi, COOKIE_SESI, UMUR_SESI_DETIK } from '$lib/server/konsol/duaFaktor';
import { catatLog } from '$lib/server/telemetri';
import { sendEmail } from '$lib/server/email';

export async function POST({ request, locals, cookies, url, getClientAddress }) {
	const u = await anggotaTim(locals);
	if (!u) return json({ message: 'Not Found' }, { status: 404 });
	if (request.headers.get('x-konsol') !== '1') return json({ message: 'Permintaan tidak sah' }, { status: 400 });

	const terkunci = await sisaKunci(u.id);
	if (terkunci) return json({ message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(terkunci / 60)} menit.`, terkunci }, { status: 429 });

	/** @type {any} */
	const b = await request.json().catch(() => ({}));
	const hasil = await periksaKode(u.id, String(b?.kode || ''));
	if (!hasil.ok) {
		const sisa = await catatGagal(u.id);
		await catatLog({ level: 'audit', sumber: 'konsol', pesan: `Kode 2FA salah (${sisa} percobaan tersisa)`, userId: u.id });
		return json({ message: sisa ? `${String(hasil.alasan).replace(/\.$/, "")}. Sisa ${sisa} percobaan.` : 'Terlalu banyak percobaan. Dikunci 15 menit.', sisa }, { status: 401 });
	}

	await hapusGagal(u.id);
	cookies.set(COOKIE_SESI, buatSesi(u.id), {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: url.protocol === 'https:',
		maxAge: UMUR_SESI_DETIK
	});
	let ip = '';
	try {
		ip = getClientAddress();
	} catch {
		ip = '';
	}
	const perangkat = String(request.headers.get('user-agent') || '').slice(0, 120);
	await catatLog({ level: 'audit', sumber: 'konsol', pesan: hasil.baruAktif ? 'Mengaktifkan 2FA & masuk Ruang Kendali' : 'Masuk Ruang Kendali (2FA)', userId: u.id, meta: { peran: u.peran } });

	// Pemberitahuan ke pemilik sistem (opsional: KONSOL_NOTIF_EMAIL)
	if (env.KONSOL_NOTIF_EMAIL) {
		const waktu = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
		sendEmail({
			to: env.KONSOL_NOTIF_EMAIL.split(',').map((s) => s.trim()).filter(Boolean),
			subject: `Ruang Kendali dibuka oleh ${u.username}`,
			html: `<p><b>${u.username}</b> (${samarkanEmail(u.email)}, peran ${u.peran}) masuk ke Ruang Kendali Bizgrow pada ${waktu} WIB.</p><p>Perangkat: ${perangkat.replace(/[<>]/g, '')}<br>IP: ${ip || '-'}</p><p>Bila ini bukan anggota tim, segera hapus aksesnya dari env Vercel.</p>`
		}).catch(() => {});
	}
	return json({ ok: true, peran: u.peran });
}
