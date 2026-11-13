/**
 * POST /api/konsol/kontrol — tindakan Ruang Kendali (khusus superadmin). Setiap tindakan dicatat di jejak audit.
 * Body JSON: { aksi, ... }
 *  - kuota         { userId, batas: number | null }  batas permintaan AI harian khusus (null = bawaan)
 *  - reset-kuota   { userId }                        nolkan penghitung kuota AI pengguna
 *  - lupakan-visi                                    paksa deteksi ulang model visi Groq
 *  - segarkan-model                                  muat ulang daftar model Groq
 *  - uji-ai                                          kirim permintaan kecil ke Groq untuk mengecek koneksi
 *  - bersihkan-log                                   hapus log & pemakaian AI > 30 hari
 */
import { json } from '@sveltejs/kit';
import { cekApiSuperadmin } from '$lib/server/konsol/akses';
import { aturBatasHarianAI, resetKuotaAI } from '$lib/server/rateLimit';
import { hapusCache } from '$lib/server/aiCache';
import { groqChatCompletion, lupakanDaftarModel, daftarModel } from '$lib/server/groq';
import { catatLog, pastikanTabel } from '$lib/server/telemetri';
import { tglWIB } from '$lib/server/konsol/data';

export async function POST({ request, locals, cookies }) {
	const { tolak, u } = await cekApiSuperadmin(locals, cookies, { pengelola: true });
	if (tolak) return tolak;
	// Lapisan tambahan anti-CSRF: hanya fetch dari halaman konsol yang mengirim header ini
	if (request.headers.get('x-konsol') !== '1') return json({ message: 'Permintaan tidak sah' }, { status: 400 });

	/** @type {any} */
	let b;
	try {
		b = await request.json();
	} catch {
		return json({ message: 'Body harus JSON' }, { status: 400 });
	}
	const aksi = String(b?.aksi || '');
	const audit = (/** @type {string} */ pesan, /** @type {unknown} */ meta) => catatLog({ level: 'audit', sumber: 'konsol', pesan, meta, userId: u.id });

	try {
		switch (aksi) {
			case 'kuota': {
				const userId = Number(b.userId);
				const batas = b.batas == null || b.batas === '' ? null : Number(b.batas);
				if (!(userId > 0) || (batas != null && !(batas >= 1 && batas <= 100000))) return json({ message: 'Data kuota tidak valid' }, { status: 400 });
				await aturBatasHarianAI(userId, batas);
				await audit(`Kuota AI harian pengguna #${userId} → ${batas ?? 'bawaan'}`, { userId, batas });
				return json({ ok: true, pesan: batas == null ? 'Kuota kembali ke bawaan' : `Kuota diatur ${batas}/hari` });
			}
			case 'reset-kuota': {
				const userId = Number(b.userId);
				if (!(userId > 0)) return json({ message: 'Pengguna tidak valid' }, { status: 400 });
				await resetKuotaAI(userId);
				await audit(`Penghitung kuota AI pengguna #${userId} dinolkan`, { userId });
				return json({ ok: true, pesan: 'Penghitung kuota dinolkan' });
			}
			case 'lupakan-visi': {
				await hapusCache('ai:visi:model');
				await audit('Memori model visi dihapus (deteksi ulang)', null);
				return json({ ok: true, pesan: 'Model visi akan dideteksi ulang pada foto berikutnya' });
			}
			case 'segarkan-model': {
				lupakanDaftarModel();
				const ids = await daftarModel();
				await audit('Daftar model Groq dimuat ulang', { jumlah: ids.length });
				return json({ ok: true, pesan: `${ids.length} model aktif`, model: ids });
			}
			case 'uji-ai': {
				const t = Date.now();
				const res = await groqChatCompletion({
					model: 'openai/gpt-oss-20b',
					jenis: 'konsol-uji',
					messages: [{ role: 'user', content: 'Balas satu kata: siap' }],
					max_tokens: 20,
					temperature: 0
				});
				const ms = Date.now() - t;
				await audit('Uji koneksi AI', { ms, model: res?.model });
				return json({ ok: true, pesan: `AI menjawab dalam ${ms} ms (${res?.model || 'model ?'})`, jawaban: String(res?.choices?.[0]?.message?.content || '').slice(0, 80), ms });
			}
			case 'bersihkan-log': {
				const p = await pastikanTabel();
				const batas = `${tglWIB(-30)} 00:00:00`;
				const [a] = await p.query('DELETE FROM pemakaian_ai WHERE waktu < ?', [batas]);
				const [l] = await p.query("DELETE FROM log_sistem WHERE waktu < ? AND level <> 'audit'", [batas]);
				const n = (a?.affectedRows || 0) + (l?.affectedRows || 0);
				await audit(`Log lama dibersihkan (${n} baris)`, { n });
				return json({ ok: true, pesan: `${n} baris lama dihapus` });
			}
			default:
				return json({ message: 'Aksi tidak dikenal' }, { status: 400 });
		}
	} catch (e) {
		return json({ message: e instanceof Error ? e.message : 'Aksi gagal' }, { status: 500 });
	}
}
