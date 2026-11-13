import { wajibSuperadmin } from '$lib/server/konsol/akses';
import { catatLog } from '$lib/server/telemetri';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, setHeaders }) {
	const u = await wajibSuperadmin(locals);
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' });
	await catatLog({ level: 'audit', sumber: 'konsol', pesan: 'Membuka Ruang Kendali', userId: u.id });
	return { admin: { nama: u.username } };
}
