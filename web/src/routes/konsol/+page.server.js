import QRCode from 'qrcode';
import { env } from '$env/dynamic/private';
import { wajibAnggota } from '$lib/server/konsol/akses';
import { COOKIE_SESI, sesiSah, status2fa, uriOtp, sisaKunci } from '$lib/server/konsol/duaFaktor';
import { catatLog } from '$lib/server/telemetri';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, cookies, setHeaders }) {
	const u = await wajibAnggota(locals);
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' });
	const admin = { nama: u.username, peran: u.peran };

	// Gerbang dua langkah: tanpa sesi konsol yang sah, data apa pun tidak dimuat
	if (!sesiSah(cookies.get(COOKIE_SESI), u.id)) {
		const st = await status2fa(u.id);
		/** @type {{ terdaftar: boolean, terkunci: number, uri?: string, qr?: string, rahasia?: string }} */
		const gerbang = { terdaftar: st.aktif, terkunci: await sisaKunci(u.id) };
		if (!st.aktif && st.rahasia) {
			gerbang.uri = uriOtp(st.rahasia, u.username);
			gerbang.qr = await QRCode.toDataURL(gerbang.uri, { margin: 1, width: 220, color: { dark: '#0b1020', light: '#ffffff' } });
			gerbang.rahasia = st.rahasia.match(/.{1,4}/g)?.join(' ') || st.rahasia;
		}
		return { admin, gerbang, risetAktif: false };
	}

	await catatLog({ level: 'audit', sumber: 'konsol', pesan: 'Membuka Ruang Kendali', userId: u.id });
	return { admin, gerbang: null, risetAktif: Boolean(String(env.KONSOL_RISET_UNIT_IDS || '').trim()) };
}
