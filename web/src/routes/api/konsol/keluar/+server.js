/** POST /api/konsol/keluar — kunci kembali Ruang Kendali (hapus sesi konsol). */
import { json } from '@sveltejs/kit';
import { anggotaTim } from '$lib/server/konsol/akses';
import { COOKIE_SESI } from '$lib/server/konsol/duaFaktor';
import { catatLog } from '$lib/server/telemetri';

export async function POST({ locals, cookies, request }) {
	const u = await anggotaTim(locals);
	if (!u) return json({ message: 'Not Found' }, { status: 404 });
	if (request.headers.get('x-konsol') !== '1') return json({ message: 'Permintaan tidak sah' }, { status: 400 });
	cookies.delete(COOKIE_SESI, { path: '/' });
	await catatLog({ level: 'audit', sumber: 'konsol', pesan: 'Mengunci Ruang Kendali (keluar)', userId: u.id });
	return json({ ok: true });
}
