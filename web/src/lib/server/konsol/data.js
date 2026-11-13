/**
 * Data Ruang Kendali — semua hanya-baca dan berupa agregat (tidak menampilkan nama pelanggan).
 * Waktu memakai string WIB seperti tabel lain (lihat dateUtils).
 */
import { env } from '$env/dynamic/private';
import { pool } from '$lib/server/drizzle';
import { redis } from '$lib/server/redis';
import { pastikanTabel } from '$lib/server/telemetri';
import { daftarModel } from '$lib/server/groq';
import { ambilCache } from '$lib/server/aiCache';
import { kandidatVisi } from '$lib/server/aiFoto';
import { AI_LIMIT_HARI, AI_LIMIT_MENIT, batasHarianAI, pemakaianHarianAI } from '$lib/server/rateLimit';
import { samarkanEmail, unitRisetDiizinkan } from '$lib/server/konsol/akses';
import { samarkanTeks } from '$lib/server/telemetri';

const WIB = 7 * 3600e3;

/** Tanggal WIB (YYYY-MM-DD) n hari dari sekarang. @param {number} n */
export function tglWIB(n = 0) {
	return new Date(Date.now() + WIB + n * 86400e3).toISOString().slice(0, 10);
}
/** Waktu WIB (YYYY-MM-DD HH:MM:SS) n jam dari sekarang. @param {number} jam */
export function waktuWIB(jam = 0) {
	return new Date(Date.now() + WIB + jam * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * @param {string} q
 * @param {unknown[]} [p]
 * @returns {Promise<any[]>}
 */
async function baris(q, p = []) {
	const [r] = await pool.query(q, p);
	return /** @type {any[]} */ (r);
}

/** @param {unknown} v */
const angka = (v) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

/** Deret tanggal WIB dari n hari lalu sampai hari ini. @param {number} n */
export function deretHari(n) {
	return Array.from({ length: n }, (_, i) => tglWIB(i - n + 1));
}

/** Deret jam ("YYYY-MM-DD HH") untuk n jam terakhir. @param {number} n */
export function deretJam(n) {
	return Array.from({ length: n }, (_, i) => waktuWIB(i - n + 1).slice(0, 13));
}

/**
 * Persentil dari daftar angka (0–100).
 * @param {number[]} xs
 * @param {number} p
 */
export function persentil(xs, p) {
	if (!xs.length) return null;
	const s = [...xs].sort((a, b) => a - b);
	const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
	return s[i];
}

/* ════════════════════════════════════════════════════════════════ ORBIT (ringkasan) */

export async function ringkasan() {
	const d30 = tglWIB(-29) + ' 00:00:00';
	const hari = tglWIB() + ' 00:00:00';
	const j48 = waktuWIB(-47).slice(0, 13) + ':00:00';
	await pastikanTabel().catch(() => null);

	const [pengguna, unit, trxUnit, posUnit, trxHariIni, posHariIni, aiHariIni, galat24, jamTrx, jamPos, jamAksi, hariTrx, hariPos] = await Promise.all([
		baris('SELECT COUNT(*) n, SUM(created_at >= ?) baru30 FROM users', [d30]),
		baris('SELECT id, user_id, nama_unit, kategori, is_cabang FROM unit_bisnis ORDER BY user_id, id'),
		baris('SELECT unit_id, COUNT(*) n, MAX(tanggal) akhir FROM transaksi WHERE tanggal >= ? GROUP BY unit_id', [d30]),
		baris("SELECT unit_id, COUNT(*) n, MAX(created_at) akhir FROM pos_orders WHERE status = 'PAID' AND created_at >= ? GROUP BY unit_id", [d30]),
		baris("SELECT COUNT(*) n, SUM(kategori_trx='MASUK') masuk, SUM(kategori_trx='KELUAR') keluar FROM transaksi WHERE tanggal >= ?", [hari]),
		baris("SELECT COUNT(*) n, COUNT(DISTINCT unit_id) unit FROM pos_orders WHERE status = 'PAID' AND created_at >= ?", [hari]),
		baris('SELECT COUNT(*) n, COALESCE(SUM(total),0) token, SUM(ok = 0) gagal FROM pemakaian_ai WHERE waktu >= ?', [hari]).catch(() => [{ n: 0, token: 0, gagal: 0 }]),
		baris("SELECT COUNT(*) n FROM log_sistem WHERE level IN ('error','warn') AND waktu >= ?", [waktuWIB(-24)]).catch(() => [{ n: 0 }]),
		baris("SELECT DATE_FORMAT(tanggal, '%Y-%m-%d %H') j, COUNT(*) n FROM transaksi WHERE tanggal >= ? GROUP BY j", [j48]),
		baris("SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H') j, COUNT(*) n FROM pos_orders WHERE status = 'PAID' AND created_at >= ? GROUP BY j", [j48]),
		baris("SELECT DATE_FORMAT(waktu, '%Y-%m-%d %H') j, COUNT(*) n FROM riwayat_aksi WHERE waktu >= ? GROUP BY j", [j48]),
		baris('SELECT DATE(tanggal) d, COUNT(*) n FROM transaksi WHERE tanggal >= ? GROUP BY d', [d30]),
		baris("SELECT DATE(created_at) d, COUNT(*) n FROM pos_orders WHERE status = 'PAID' AND created_at >= ? GROUP BY d", [d30])
	]);
	const pemilik = await baris('SELECT id, username FROM users WHERE id IN (SELECT DISTINCT user_id FROM unit_bisnis) ORDER BY id');

	const tMap = new Map(trxUnit.map((r) => [r.unit_id, r]));
	const pMap = new Map(posUnit.map((r) => [r.unit_id, r]));
	const batasAktif = waktuWIB(-24);
	const units = unit.map((u) => {
		const t = tMap.get(u.id);
		const p = pMap.get(u.id);
		const akhir = [t?.akhir, p?.akhir].filter(Boolean).sort().pop() || null;
		return {
			id: u.id,
			pemilik: u.user_id,
			nama: u.nama_unit,
			kategori: u.kategori || 'lainnya',
			cabang: Boolean(u.is_cabang),
			trx30: angka(t?.n),
			pos30: angka(p?.n),
			akhir,
			aktif24: Boolean(akhir && akhir >= batasAktif)
		};
	});

	/** @param {any[]} rs */
	const peta = (rs) => new Map(rs.map((r) => [String(r.j ?? r.d).slice(0, 13), angka(r.n)]));
	const jT = peta(jamTrx);
	const jP = peta(jamPos);
	const jA = peta(jamAksi);
	const denyut = deretJam(48).map((j) => ({ jam: j, trx: jT.get(j) || 0, pos: jP.get(j) || 0, aksi: jA.get(j) || 0 }));
	const hT = new Map(hariTrx.map((r) => [String(r.d).slice(0, 10), angka(r.n)]));
	const hP = new Map(hariPos.map((r) => [String(r.d).slice(0, 10), angka(r.n)]));
	const tren = deretHari(30).map((d) => ({ tanggal: d, trx: hT.get(d) || 0, pos: hP.get(d) || 0 }));

	return {
		waktu: waktuWIB(),
		angka: {
			pengguna: angka(pengguna[0]?.n),
			penggunaBaru30: angka(pengguna[0]?.baru30),
			unit: units.length,
			unitAktif24: units.filter((u) => u.aktif24).length,
			trxHariIni: angka(trxHariIni[0]?.n),
			masukHariIni: angka(trxHariIni[0]?.masuk),
			keluarHariIni: angka(trxHariIni[0]?.keluar),
			posHariIni: angka(posHariIni[0]?.n),
			unitPosHariIni: angka(posHariIni[0]?.unit),
			aiPermintaanHariIni: angka(aiHariIni[0]?.n),
			aiTokenHariIni: angka(aiHariIni[0]?.token),
			aiGagalHariIni: angka(aiHariIni[0]?.gagal),
			galat24: angka(galat24[0]?.n)
		},
		pemilik: pemilik.map((p) => ({ id: p.id, nama: p.username })),
		units,
		denyut,
		tren
	};
}

/* ════════════════════════════════════════════════════════════════ DENYUT (kesehatan) */

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<{ ok: boolean, ms: number, nilai?: T, galat?: string }>}
 */
async function ukur(fn) {
	const t = performance.now();
	try {
		const nilai = await fn();
		return { ok: true, ms: Math.round(performance.now() - t), nilai };
	} catch (e) {
		return { ok: false, ms: Math.round(performance.now() - t), galat: String(e instanceof Error ? e.message : e).slice(0, 200) };
	}
}

/** Nama env penting yang dicek keberadaannya (nilai TIDAK pernah dikirim). */
const ENV_PENTING = [
	['DATABASE_URL', 'Basis data'],
	['UPSTASH_REDIS_REST_URL', 'Redis (cache, kuota, sesi)'],
	['GROQ_API_KEY', 'AI (Groq)'],
	['GROQ_VISION_MODEL', 'Model visi khusus (opsional)'],
	['SOCKET_SERVER_URL', 'Server realtime (Socket.io)'],
	['SOCKET_API_KEY', 'Kunci server realtime'],
	['RESEND_API_KEY', 'Email (Resend)'],
	['MIDTRANS_SERVER_KEY', 'Pembayaran (Midtrans)'],
	['GOOGLE_CLIENT_ID', 'Login Google'],
	['SUPERADMIN_EMAILS', 'Akses Ruang Kendali'],
	['ORIGIN', 'Origin aplikasi']
];

export async function kesehatan() {
	await pastikanTabel().catch(() => null);
	const socketUrl = env.SOCKET_SERVER_URL ? env.SOCKET_SERVER_URL.replace(/\/$/, '') : null;

	const [dbPing, dbInfo, tabel, redisPing, redisUkuran, socket, groq, visiIngat, galatTerakhir, galatJam] = await Promise.all([
		ukur(async () => {
			const xs = [];
			for (let i = 0; i < 3; i++) {
				const t = performance.now();
				await pool.query('SELECT 1');
				xs.push(performance.now() - t);
			}
			return Math.round(persentil(xs, 50) || 0);
		}),
		ukur(() => baris('SELECT VERSION() v').then((r) => r[0]?.v)),
		ukur(() =>
			baris(
				'SELECT table_name nama, table_rows baris, (data_length + index_length) ukuran FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY ukuran DESC LIMIT 40'
			)
		),
		ukur(async () => {
			if (!redis) throw new Error('Redis tidak dikonfigurasi');
			return await redis.ping();
		}),
		ukur(async () => (redis ? await redis.dbsize() : null)),
		ukur(async () => {
			if (!socketUrl) throw new Error('SOCKET_SERVER_URL belum diisi');
			const ac = new AbortController();
			const t = setTimeout(() => ac.abort(), 4000);
			try {
				const r = await fetch(`${socketUrl}/health`, { signal: ac.signal });
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return await r.json();
			} finally {
				clearTimeout(t);
			}
		}),
		ukur(() => daftarModel()),
		ukur(() => ambilCache('ai:visi:model')),
		baris("SELECT id, waktu, level, sumber, pesan, status FROM log_sistem WHERE level <> 'audit' ORDER BY id DESC LIMIT 60").catch(() => []),
		baris("SELECT DATE_FORMAT(waktu, '%Y-%m-%d %H') j, level, COUNT(*) n FROM log_sistem WHERE level IN ('error','warn') AND waktu >= ? GROUP BY j, level", [waktuWIB(-23).slice(0, 13) + ':00:00']).catch(() => [])
	]);

	const modelIds = /** @type {string[]} */ (groq.nilai || []);
	const visi = await kandidatVisi(async () => modelIds).catch(() => []);
	const mem = process.memoryUsage();
	const gj = new Map();
	for (const r of galatJam) {
		const k = String(r.j).slice(0, 13);
		const o = gj.get(k) || { error: 0, warn: 0 };
		o[r.level === 'warn' ? 'warn' : 'error'] += angka(r.n);
		gj.set(k, o);
	}

	return {
		waktu: waktuWIB(),
		layanan: {
			db: { ok: dbPing.ok, ms: dbPing.nilai ?? dbPing.ms, versi: dbInfo.nilai || null, galat: dbPing.galat },
			redis: { ok: redisPing.ok, ms: redisPing.ms, kunci: redisUkuran.nilai ?? null, galat: redisPing.galat },
			socket: {
				ok: socket.ok,
				ms: socket.ms,
				klien: socket.nilai?.connectedClients ?? null,
				galat: socket.galat,
				host: socketUrl ? new URL(socketUrl).host : null
			},
			groq: { ok: groq.ok && modelIds.length > 0, ms: groq.ms, jumlahModel: modelIds.length, galat: groq.ok && !modelIds.length ? 'Daftar model kosong (kunci API?)' : groq.galat }
		},
		ai: {
			model: modelIds,
			kandidatVisi: visi,
			visiDiingat: visiIngat.nilai === '-' ? 'tidak ada (OCR di perangkat)' : visiIngat.nilai || null,
			batas: { perMenit: AI_LIMIT_MENIT.limit, perHari: AI_LIMIT_HARI.limit }
		},
		runtime: {
			node: process.version,
			platform: `${process.platform}/${process.arch}`,
			uptimeDetik: Math.round(process.uptime()),
			memoriMB: { rss: Math.round(mem.rss / 1048576), heap: Math.round(mem.heapUsed / 1048576), heapTotal: Math.round(mem.heapTotal / 1048576) },
			wilayah: env.VERCEL_REGION || process.env.VERCEL_REGION || 'lokal',
			lingkungan: env.VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
			commit: (env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
			pesanCommit: (env.VERCEL_GIT_COMMIT_MESSAGE || process.env.VERCEL_GIT_COMMIT_MESSAGE || '').split('\n')[0].slice(0, 120) || null,
			cabang: env.VERCEL_GIT_COMMIT_REF || process.env.VERCEL_GIT_COMMIT_REF || null
		},
		konfigurasi: ENV_PENTING.map(([k, label]) => ({ kunci: k, label, ada: Boolean(env[k] || process.env[k]) })),
		tabel: tabel.ok ? (tabel.nilai || []).map((/** @type {any} */ t) => ({ nama: t.nama ?? t.TABLE_NAME, baris: angka(t.baris ?? t.TABLE_ROWS), ukuran: angka(t.ukuran) })) : [],
		galat: galatTerakhir.map((r) => ({ id: r.id, waktu: r.waktu, level: r.level, sumber: r.sumber, pesan: samarkanTeks(r.pesan), status: r.status })),
		galatPerJam: deretJam(24).map((j) => ({ jam: j, ...(gj.get(j) || { error: 0, warn: 0 }) }))
	};
}

/* ════════════════════════════════════════════════════════════════ NEURON (AI) */

export async function pemakaianAI() {
	await pastikanTabel();
	const d30 = tglWIB(-29) + ' 00:00:00';
	const d7 = tglWIB(-6) + ' 00:00:00';
	const hari = tglWIB() + ' 00:00:00';
	const [perHari, perModel, perPengguna, latensi, perJam, total] = await Promise.all([
		baris('SELECT DATE(waktu) d, COALESCE(jenis, \'lainnya\') jenis, SUM(total) token, COUNT(*) n, SUM(ok = 0) gagal FROM pemakaian_ai WHERE waktu >= ? GROUP BY d, jenis', [d30]),
		baris('SELECT COALESCE(model, \'-\') model, SUM(total) token, COUNT(*) n, SUM(ok = 0) gagal FROM pemakaian_ai WHERE waktu >= ? GROUP BY model ORDER BY token DESC', [d30]),
		baris(
			`SELECT p.user_id, u.username, u.email, SUM(p.total) token, COUNT(*) n, SUM(p.ok = 0) gagal, MAX(p.waktu) akhir
			 FROM pemakaian_ai p LEFT JOIN users u ON u.id = p.user_id WHERE p.waktu >= ? AND p.user_id IS NOT NULL
			 GROUP BY p.user_id, u.username, u.email ORDER BY token DESC LIMIT 25`,
			[d30]
		),
		baris('SELECT ms FROM pemakaian_ai WHERE waktu >= ? AND ok = 1 AND ms IS NOT NULL ORDER BY id DESC LIMIT 3000', [d7]),
		baris('SELECT HOUR(waktu) h, COUNT(*) n, SUM(total) token FROM pemakaian_ai WHERE waktu >= ? GROUP BY h', [d7]),
		baris(
			'SELECT SUM(waktu >= ?) nHari, SUM(CASE WHEN waktu >= ? THEN total ELSE 0 END) tokenHari, SUM(waktu >= ?) n7, SUM(CASE WHEN waktu >= ? THEN total ELSE 0 END) token7, COUNT(*) n30, COALESCE(SUM(total),0) token30, SUM(ok = 0) gagal30, COALESCE(SUM(prompt),0) prompt30, COALESCE(SUM(completion),0) completion30 FROM pemakaian_ai WHERE waktu >= ?',
			[hari, hari, d7, d7, d30]
		)
	]);

	const jenisSemua = [...new Set(perHari.map((r) => r.jenis))];
	const peta = new Map();
	for (const r of perHari) peta.set(`${String(r.d).slice(0, 10)}|${r.jenis}`, r);
	const harian = deretHari(30).map((d) => {
		/** @type {Record<string, number>} */
		const per = {};
		let gagal = 0;
		let n = 0;
		for (const j of jenisSemua) {
			const r = peta.get(`${d}|${j}`);
			per[j] = angka(r?.token);
			gagal += angka(r?.gagal);
			n += angka(r?.n);
		}
		return { tanggal: d, per, n, gagal };
	});
	const ms = latensi.map((r) => angka(r.ms));
	const jam = Array.from({ length: 24 }, (_, h) => {
		const r = perJam.find((x) => angka(x.h) === h);
		return { jam: h, n: angka(r?.n), token: angka(r?.token) };
	});
	const pengguna = await Promise.all(
		perPengguna.map(async (r) => ({
			id: r.user_id,
			nama: r.username || `#${r.user_id}`,
			email: samarkanEmail(r.email),
			token: angka(r.token),
			n: angka(r.n),
			gagal: angka(r.gagal),
			akhir: r.akhir,
			kuotaHari: await batasHarianAI(r.user_id),
			terpakaiHari: await pemakaianHarianAI(r.user_id)
		}))
	);
	const t = total[0] || {};
	return {
		waktu: waktuWIB(),
		total: {
			permintaanHari: angka(t.nHari),
			tokenHari: angka(t.tokenHari),
			permintaan7: angka(t.n7),
			token7: angka(t.token7),
			permintaan30: angka(t.n30),
			token30: angka(t.token30),
			gagal30: angka(t.gagal30),
			prompt30: angka(t.prompt30),
			completion30: angka(t.completion30)
		},
		latensi: { p50: persentil(ms, 50), p95: persentil(ms, 95), sampel: ms.length },
		jenis: jenisSemua,
		harian,
		model: perModel.map((r) => ({ model: r.model, token: angka(r.token), n: angka(r.n), gagal: angka(r.gagal) })),
		pengguna,
		jam,
		batas: { perMenit: AI_LIMIT_MENIT.limit, perHari: AI_LIMIT_HARI.limit },
		redis: Boolean(redis)
	};
}

/* ════════════════════════════════════════════════════════════════ TENANT */

export async function tenant() {
	await pastikanTabel().catch(() => null);
	const d30 = tglWIB(-29) + ' 00:00:00';
	const d14 = tglWIB(-13) + ' 00:00:00';
	const [pengguna, unit, trx, pos, trx14, pos14, ai, produk] = await Promise.all([
		baris('SELECT id, username, email, role, created_at FROM users ORDER BY id'),
		baris('SELECT id, user_id, nama_unit, slug, kategori, is_cabang FROM unit_bisnis ORDER BY id'),
		baris('SELECT unit_id, COUNT(*) n, MAX(tanggal) akhir FROM transaksi WHERE tanggal >= ? GROUP BY unit_id', [d30]),
		baris("SELECT unit_id, COUNT(*) n, MAX(created_at) akhir FROM pos_orders WHERE status='PAID' AND created_at >= ? GROUP BY unit_id", [d30]),
		baris('SELECT unit_id, DATE(tanggal) d, COUNT(*) n FROM transaksi WHERE tanggal >= ? GROUP BY unit_id, d', [d14]),
		baris("SELECT unit_id, DATE(created_at) d, COUNT(*) n FROM pos_orders WHERE status='PAID' AND created_at >= ? GROUP BY unit_id, d", [d14]),
		baris('SELECT user_id, COALESCE(SUM(total),0) token, COUNT(*) n FROM pemakaian_ai WHERE waktu >= ? AND user_id IS NOT NULL GROUP BY user_id', [d30]).catch(() => []),
		baris('SELECT unit_id, COUNT(*) n, SUM(stok <= min_stok) menipis FROM products WHERE deleted_at IS NULL GROUP BY unit_id')
	]);
	const hari14 = deretHari(14);
	/** @type {Map<string, number>} */
	const spark = new Map();
	for (const r of [...trx14, ...pos14]) {
		const k = `${r.unit_id}|${String(r.d).slice(0, 10)}`;
		spark.set(k, (spark.get(k) || 0) + angka(r.n));
	}
	const tM = new Map(trx.map((r) => [r.unit_id, r]));
	const pM = new Map(pos.map((r) => [r.unit_id, r]));
	const aM = new Map(ai.map((r) => [r.user_id, r]));
	const prM = new Map(produk.map((r) => [r.unit_id, r]));
	const batasAktif = waktuWIB(-24);
	return {
		waktu: waktuWIB(),
		pengguna: pengguna.map((u) => {
			const milik = unit.filter((x) => x.user_id === u.id);
			const units = milik.map((x) => {
				const t = tM.get(x.id);
				const p = pM.get(x.id);
				const akhir = [t?.akhir, p?.akhir].filter(Boolean).sort().pop() || null;
				return {
					id: x.id,
					nama: x.nama_unit,
					slug: x.slug,
					kategori: x.kategori || 'lainnya',
					cabang: Boolean(x.is_cabang),
					trx30: angka(t?.n),
					pos30: angka(p?.n),
					riset: unitRisetDiizinkan(x.id),
					produk: angka(prM.get(x.id)?.n),
					menipis: angka(prM.get(x.id)?.menipis),
					akhir,
					aktif24: Boolean(akhir && akhir >= batasAktif),
					spark: hari14.map((d) => spark.get(`${x.id}|${d}`) || 0)
				};
			});
			const akhir = units.map((x) => x.akhir).filter(Boolean).sort().pop() || null;
			return {
				id: u.id,
				nama: u.username,
				email: samarkanEmail(u.email),
				peran: u.role,
				dibuat: u.created_at,
				aiToken30: angka(aM.get(u.id)?.token),
				aiPermintaan30: angka(aM.get(u.id)?.n),
				akhir,
				units
			};
		})
	};
}

/** Detail satu unit: peta panas aktivitas (hari × jam), modul yang dipakai, aksi terakhir. @param {number} unitId */
export async function detailUnit(unitId) {
	const d90 = tglWIB(-89) + ' 00:00:00';
	const d30 = tglWIB(-29) + ' 00:00:00';
	const [info, panasPos, panasTrx, modul, aksi, metode] = await Promise.all([
		baris('SELECT u.id, u.nama_unit, u.kategori, u.slug, us.username FROM unit_bisnis u JOIN users us ON us.id = u.user_id WHERE u.id = ?', [unitId]),
		baris("SELECT WEEKDAY(created_at) h, HOUR(created_at) j, COUNT(*) n FROM pos_orders WHERE unit_id = ? AND status='PAID' AND created_at >= ? GROUP BY h, j", [unitId, d90]),
		baris('SELECT WEEKDAY(tanggal) h, HOUR(tanggal) j, COUNT(*) n FROM transaksi WHERE unit_id = ? AND tanggal >= ? GROUP BY h, j', [unitId, d90]),
		baris("SELECT COALESCE(kategori, 'lainnya') kategori, COUNT(*) n FROM riwayat_aksi WHERE unit_id = ? AND waktu >= ? GROUP BY kategori ORDER BY n DESC", [unitId, d30]),
		baris('SELECT waktu, tipe, kategori FROM riwayat_aksi WHERE unit_id = ? ORDER BY id DESC LIMIT 12', [unitId]),
		baris("SELECT payment_method m, COUNT(*) n FROM pos_orders WHERE unit_id = ? AND status='PAID' AND created_at >= ? GROUP BY m ORDER BY n DESC", [unitId, d30])
	]);
	if (!info.length) return null;
	const panas = Array.from({ length: 7 }, () => Array(24).fill(0));
	for (const r of [...panasPos, ...panasTrx]) panas[angka(r.h)][angka(r.j)] += angka(r.n);
	return {
		id: info[0].id,
		nama: info[0].nama_unit,
		kategori: info[0].kategori,
		pemilik: info[0].username,
		panas,
		modul: modul.map((r) => ({ kategori: r.kategori, n: angka(r.n) })),
		metode: metode.map((r) => ({ metode: r.m || '-', n: angka(r.n) })),
		aksi: aksi.map((r) => ({ waktu: r.waktu, tipe: r.tipe, kategori: r.kategori || 'umum' }))
	};
}

/* ════════════════════════════════════════════════════════════════ RISET (Lembar G) */

/** @param {unknown} s */
export const tanggalSah = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/**
 * Kueri Lembar G (Paket Lapangan) untuk satu unit & periode [mulai, akhir).
 * @param {number} unitId
 * @param {string} mulai  YYYY-MM-DD (inklusif)
 * @param {string} akhir  YYYY-MM-DD (eksklusif, seperti di Lembar G)
 */
export async function riset(unitId, mulai, akhir) {
	if (!unitRisetDiizinkan(unitId)) return null;
	const m = `${mulai} 00:00:00`;
	const a = `${akhir} 00:00:00`;
	const [unit] = await baris('SELECT id, user_id, nama_unit FROM unit_bisnis WHERE id = ?', [unitId]);
	if (!unit) return null;
	const q = /** @type {const} */ ({
		L1: ['Total pemasukan dan pengeluaran pada periode', 'SELECT kategori_trx, COUNT(*) AS jumlah, SUM(nominal) AS total FROM transaksi WHERE unit_id = ? AND tanggal >= ? AND tanggal < ? GROUP BY kategori_trx', [unitId, m, a]],
		L2: [
			'Penjualan POS pada periode (status PAID)',
			"SELECT COUNT(*) AS jumlah_order, SUM(subtotal) AS subtotal, SUM(discount) AS diskon, SUM(total) AS total_pos FROM pos_orders WHERE unit_id = ? AND status = 'PAID' AND created_at >= ? AND created_at < ?",
			[unitId, m, a]
		],
		L3: ['Stok akhir setiap produk', 'SELECT nama, stok, min_stok FROM products WHERE unit_id = ? AND deleted_at IS NULL ORDER BY nama', [unitId]],
		U1: [
			'Hari aktif dan jumlah transaksi per bulan',
			"SELECT DATE_FORMAT(tanggal, '%Y-%m') AS bulan, COUNT(DISTINCT DATE(tanggal)) AS hari_aktif, COUNT(*) AS jumlah_transaksi FROM transaksi WHERE unit_id = ? AND tanggal >= ? AND tanggal < ? GROUP BY bulan ORDER BY bulan",
			[unitId, m, a]
		],
		U2: [
			'Penjualan POS per bulan dan metode pembayaran',
			"SELECT DATE_FORMAT(created_at, '%Y-%m') AS bulan, payment_method, COUNT(*) AS jumlah FROM pos_orders WHERE unit_id = ? AND status = 'PAID' AND created_at >= ? AND created_at < ? GROUP BY bulan, payment_method ORDER BY bulan",
			[unitId, m, a]
		],
		U3: ['Mutasi stok per jenis', 'SELECT alasan, COUNT(*) AS jumlah, SUM(perubahan) AS total_perubahan FROM stock_logs WHERE unit_id = ? AND created_at >= ? AND created_at < ? GROUP BY alasan', [unitId, m, a]],
		U4: ['Aktivitas per kategori fitur (jejak aksi)', 'SELECT kategori, COUNT(*) AS jumlah FROM riwayat_aksi WHERE unit_id = ? AND waktu >= ? AND waktu < ? GROUP BY kategori ORDER BY jumlah DESC', [unitId, m, a]],
		U5: ['Unit bisnis milik pemilik', 'SELECT id, nama_unit, slug, kategori, is_cabang FROM unit_bisnis WHERE user_id = ?', [unit.user_id]]
	});
	/** @type {Record<string, { judul: string, sql: string, baris: any[], galat?: string }>} */
	const hasil = {};
	for (const [kode, [judul, sqlq, p]] of Object.entries(q)) {
		try {
			hasil[kode] = { judul, sql: sqlq, baris: await baris(sqlq, /** @type {any} */ (p)) };
		} catch (e) {
			hasil[kode] = { judul, sql: sqlq, baris: [], galat: e instanceof Error ? e.message : String(e) };
		}
	}
	return { unit: { id: unit.id, nama: unit.nama_unit }, mulai, akhir, hasil };
}

/** Daftar unit untuk Riset — HANYA unit yang pemiliknya sudah menyetujui (KONSOL_RISET_UNIT_IDS). */
export async function daftarUnit() {
	const r = await baris('SELECT u.id, u.nama_unit, us.username FROM unit_bisnis u JOIN users us ON us.id = u.user_id ORDER BY us.username, u.nama_unit');
	return r.filter((x) => unitRisetDiizinkan(x.id)).map((x) => ({ id: x.id, nama: x.nama_unit, pemilik: x.username }));
}

/* ════════════════════════════════════════════════════════════════ JEJAK (audit) */

export async function jejak() {
	await pastikanTabel().catch(() => null);
	const [audit, aksi] = await Promise.all([
		baris("SELECT l.id, l.waktu, l.pesan, l.meta, u.username FROM log_sistem l LEFT JOIN users u ON u.id = l.user_id WHERE l.level = 'audit' ORDER BY l.id DESC LIMIT 80").catch(() => []),
		baris(
			'SELECT r.id, r.waktu, r.tipe, r.kategori, ub.nama_unit, us.username FROM riwayat_aksi r JOIN unit_bisnis ub ON ub.id = r.unit_id JOIN users us ON us.id = r.user_id ORDER BY r.id DESC LIMIT 80'
		)
	]);
	return {
		waktu: waktuWIB(),
		audit: audit.map((r) => ({ id: r.id, waktu: r.waktu, pesan: r.pesan, oleh: r.username || '-' })),
		aksi: aksi.map((r) => ({ id: r.id, waktu: r.waktu, tipe: r.tipe, kategori: r.kategori || 'umum', unit: r.nama_unit, oleh: r.username }))
	};
}
