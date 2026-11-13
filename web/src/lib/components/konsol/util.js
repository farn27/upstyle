/** Utilitas tampilan Ruang Kendali. */

export const WARNA = {
	aqua: '#3ef0d0',
	ungu: '#9b8cff',
	amber: '#ffc65c',
	mawar: '#ff6b8a',
	biru: '#5aa8ff',
	hijau: '#7dffa1',
	jingga: '#ff9a62',
	merah_muda: '#f79bff'
};

/** Palet berurutan untuk seri data. */
export const PALET = [WARNA.aqua, WARNA.ungu, WARNA.amber, WARNA.mawar, WARNA.biru, WARNA.hijau, WARNA.jingga, WARNA.merah_muda];

/** Warna stabil dari teks (kategori, jenis AI, model). @param {string} s */
export function warnaDari(s) {
	let h = 0;
	for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
	return PALET[h % PALET.length];
}

const fmtAngka = new Intl.NumberFormat('id-ID');
/** @param {number | null | undefined} n */
export const angka = (n) => (n == null || Number.isNaN(n) ? '–' : fmtAngka.format(Math.round(n)));

/** Singkat: 1,2 rb · 3,4 jt · 1,1 M. @param {number | null | undefined} n */
export function singkat(n) {
	if (n == null || Number.isNaN(n)) return '–';
	const a = Math.abs(n);
	const f = (/** @type {number} */ x, /** @type {string} */ s) => `${x.toLocaleString('id-ID', { maximumFractionDigits: x < 10 ? 1 : 0 })} ${s}`;
	if (a >= 1e9) return f(n / 1e9, 'M');
	if (a >= 1e6) return f(n / 1e6, 'jt');
	if (a >= 1e4) return f(n / 1e3, 'rb');
	return fmtAngka.format(Math.round(n));
}

/** @param {number | null | undefined} n */
export const rupiah = (n) => (n == null ? '–' : `Rp${singkat(n)}`);

/** Byte → KB/MB. @param {number} b */
export function ukuranBerkas(b) {
	if (b >= 1048576) return `${(b / 1048576).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
	if (b >= 1024) return `${Math.round(b / 1024)} KB`;
	return `${b} B`;
}

/** String waktu WIB "YYYY-MM-DD HH:MM:SS" → milidetik epoch. @param {string | null | undefined} s */
export function msDariWIB(s) {
	if (!s) return NaN;
	return Date.parse(String(s).replace(' ', 'T').slice(0, 19) + '+07:00');
}

/** "3 mnt lalu", "2 j lalu", "5 hr lalu". @param {string | null | undefined} s */
export function relatif(s) {
	const t = msDariWIB(s);
	if (Number.isNaN(t)) return 'belum pernah';
	const d = Math.max(0, (Date.now() - t) / 1000);
	if (d < 60) return 'baru saja';
	if (d < 3600) return `${Math.floor(d / 60)} mnt lalu`;
	if (d < 86400) return `${Math.floor(d / 3600)} j lalu`;
	if (d < 86400 * 45) return `${Math.floor(d / 86400)} hr lalu`;
	return String(s).slice(0, 10);
}

/** Jam WIB sekarang (HH:MM:SS). */
export function jamWIB() {
	return new Date(Date.now() + 7 * 3600e3).toISOString().slice(11, 19);
}

/** Durasi detik → "2 j 14 m". @param {number} detik */
export function durasi(detik) {
	const j = Math.floor(detik / 3600);
	const m = Math.floor((detik % 3600) / 60);
	if (j > 48) return `${Math.floor(j / 24)} hr`;
	return j ? `${j} j ${m} m` : `${m} m ${Math.floor(detik % 60)} d`;
}

/**
 * Kurva halus (Catmull-Rom → Bezier) melalui titik-titik.
 * @param {Array<[number, number]>} p
 */
export function kurva(p) {
	if (!p.length) return '';
	if (p.length < 3) return 'M' + p.map((q) => q.join(',')).join(' L');
	let d = `M${p[0][0]},${p[0][1]}`;
	for (let i = 0; i < p.length - 1; i++) {
		const a = p[i - 1] || p[i];
		const b = p[i];
		const c = p[i + 1];
		const e = p[i + 2] || c;
		const k = 0.18;
		d += ` C${b[0] + (c[0] - a[0]) * k},${b[1] + (c[1] - a[1]) * k} ${c[0] - (e[0] - b[0]) * k},${c[1] - (e[1] - b[1]) * k} ${c[0]},${c[1]}`;
	}
	return d;
}

/**
 * Baris objek → CSV (pemisah ; agar langsung terbuka rapi di Excel berbahasa Indonesia).
 * @param {Record<string, unknown>[]} rows
 */
export function keCSV(rows) {
	if (!rows.length) return '';
	const kol = Object.keys(rows[0]);
	const esc = (/** @type {unknown} */ v) => {
		const s = v == null ? '' : String(v);
		return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	};
	return [kol.join(';'), ...rows.map((r) => kol.map((k) => esc(r[k])).join(';'))].join('\n');
}

/** Unduh teks sebagai berkas. @param {string} nama @param {string} isi @param {string} [tipe] */
export function unduh(nama, isi, tipe = 'text/csv;charset=utf-8') {
	const blob = new Blob(['﻿' + isi], { type: tipe });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = nama;
	a.click();
	setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Pengguna memilih gerak minimal. */
export function gerakMinimal() {
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Tata letak treemap (squarified).
 * @template {{ nilai: number }} T
 * @param {T[]} data
 * @param {number} w
 * @param {number} h
 * @returns {Array<T & { x: number, y: number, w: number, h: number }>}
 */
export function treemap(data, w, h) {
	const total = data.reduce((s, d) => s + d.nilai, 0);
	if (!total) return [];
	const skala = (w * h) / total;
	const item = data.filter((d) => d.nilai > 0).map((d) => ({ d, a: d.nilai * skala }));
	/** @type {Array<any>} */
	const hasil = [];
	let x = 0;
	let y = 0;
	let lw = w;
	let lh = h;
	/** @param {number[]} baris @param {number} sisi */
	const terburuk = (baris, sisi) => {
		const s = baris.reduce((a, b) => a + b, 0);
		const mx = Math.max(...baris);
		const mn = Math.min(...baris);
		return Math.max((sisi * sisi * mx) / (s * s), (s * s) / (sisi * sisi * mn));
	};
	let i = 0;
	while (i < item.length) {
		const sisi = Math.min(lw, lh);
		const baris = [item[i]];
		i++;
		while (i < item.length && terburuk([...baris, item[i]].map((r) => r.a), sisi) <= terburuk(baris.map((r) => r.a), sisi)) {
			baris.push(item[i]);
			i++;
		}
		const s = baris.reduce((a, r) => a + r.a, 0);
		if (lw >= lh) {
			const tw = s / lh;
			let yy = y;
			for (const r of baris) {
				const th = r.a / tw;
				hasil.push({ ...r.d, x, y: yy, w: tw, h: th });
				yy += th;
			}
			x += tw;
			lw -= tw;
		} else {
			const th = s / lw;
			let xx = x;
			for (const r of baris) {
				const tw = r.a / th;
				hasil.push({ ...r.d, x: xx, y, w: tw, h: th });
				xx += tw;
			}
			y += th;
			lh -= th;
		}
	}
	return hasil;
}
