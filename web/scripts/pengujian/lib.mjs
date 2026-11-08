// Pustaka bersama skrip pengujian Bizgrow (Node 18+, tanpa dependensi tambahan).
import fs from 'node:fs';
import path from 'node:path';

export function muatConfig() {
	const f = path.resolve(import.meta.dirname, 'config.json');
	if (!fs.existsSync(f)) {
		console.error('config.json belum ada. Salin config.contoh.json menjadi config.json lalu isi.');
		process.exit(1);
	}
	const c = JSON.parse(fs.readFileSync(f, 'utf8'));
	c.baseUrl = c.baseUrl.replace(/\/$/, '');
	return c;
}

export const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
export const stempel = () => new Date().toISOString().replace(/[:.]/g, '-');

/** Folder bukti per sesi: bukti/<tanggal>/<sub> (semua skrip di hari yang sama berbagi satu folder; ganti dengan SESI_BUKTI=nama). Berkas di sini yang dilampirkan sebagai bukti skripsi. */
export function folderBukti(sub, sesi = process.env.SESI_BUKTI || new Date().toISOString().slice(0, 10)) {
	const d = path.resolve(import.meta.dirname, 'bukti', sesi, sub);
	fs.mkdirSync(d, { recursive: true });
	return d;
}

/** Sembunyikan rahasia sebelum disimpan sebagai bukti. */
export function samarkan(teks) {
	return String(teks)
		.replace(/("token"\s*:\s*")[^"]+/g, '$1[DISAMARKAN]')
		.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, '$1[DISAMARKAN]')
		.replace(/((?:session_id|staff_session_token)=)[^;\s]+/g, '$1[DISAMARKAN]');
}

/** fetch dengan pengukuran waktu (ms) dan hasil terstruktur. redirect tidak diikuti agar 303 terlihat. */
export async function minta(url, { method = 'GET', headers = {}, body, token, timeout = 60000 } = {}) {
	const h = { ...headers };
	if (token) h.authorization = `Bearer ${token}`;
	if (body && typeof body === 'object' && !(body instanceof URLSearchParams)) {
		h['content-type'] = h['content-type'] || 'application/json';
		body = JSON.stringify(body);
	}
	const t0 = performance.now();
	let res, teks = '', galat = null;
	try {
		res = await fetch(url, { method, headers: h, body, redirect: 'manual', signal: AbortSignal.timeout(timeout) });
		teks = await res.text();
	} catch (e) {
		galat = String(e?.message || e);
	}
	const ms = Math.round(performance.now() - t0);
	let json = null;
	try { json = JSON.parse(teks); } catch { /* bukan JSON */ }
	return {
		url, method, status: res?.status ?? 0, ms, teks, json, galat,
		lokasi: res?.headers.get('location') || '',
		setCookie: res?.headers.getSetCookie?.() || [],
		headers: Object.fromEntries(res?.headers ?? [])
	};
}

export async function masuk(base, { email, password }) {
	const r = await minta(`${base}/api/auth/login`, { method: 'POST', body: { email, password } });
	const token = r.json?.data?.token;
	if (!token) throw new Error(`Login API gagal untuk ${email}: HTTP ${r.status} ${r.json?.message ?? r.galat ?? ''}`);
	return { token, user: r.json.data.user };
}

export function simpanBukti(dir, nama, r, catatan = '') {
	const isi = [
		`# ${nama}`, catatan && `# ${catatan}`,
		`# waktu: ${new Date().toISOString()}`,
		`${r.method} ${r.url}`,
		`HTTP ${r.status}  (${r.ms} ms)${r.lokasi ? '  Location: ' + r.lokasi : ''}`,
		r.setCookie.length ? `Set-Cookie: ${r.setCookie.map((c) => c.split('=')[0]).join(', ')}` : 'Set-Cookie: (tidak ada)',
		'', samarkan(r.teks).slice(0, 4000), r.galat ? `\nGALAT JARINGAN: ${r.galat}` : ''
	].filter((x) => x !== '' && x !== false).join('\n');
	fs.writeFileSync(path.join(dir, `${nama}.txt`), isi);
}

export function csv(baris, kolom) {
	const esc = (v) => {
		const s = v === null || v === undefined ? '' : String(v);
		return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	};
	return [kolom.join(','), ...baris.map((b) => kolom.map((k) => esc(b[k])).join(','))].join('\n') + '\n';
}

export function statistik(angka) {
	const a = angka.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
	if (!a.length) return { n: 0, min: null, median: null, maks: null };
	const m = a.length >> 1;
	return { n: a.length, min: a[0], median: a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2), maks: a.at(-1) };
}
