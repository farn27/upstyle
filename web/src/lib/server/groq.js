import { env } from '$env/dynamic/private';

/** Nama model lama di kode → model yang benar-benar dipanggil */
const MODEL_MAP = {
	'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
	'llama-3.1-8b-instant': 'openai/gpt-oss-20b'
};

/**
 * Model cadangan. Batas pemakaian Groq (token per menit) dihitung PER MODEL, jadi saat satu model
 * ditolak (HTTP 429) model lain biasanya masih bisa dipakai. Urutan: mirip dulu, lalu yang lain.
 */
const CADANGAN = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

/** Model penalaran: sebagian max_tokens terpakai untuk "berpikir" sebelum menulis jawaban */
const modelPenalaran = (/** @type {string} */ m) => /gpt-oss|qwen|deepseek/i.test(m);

const BATAS_WAKTU_MS = 25_000;

/** Alamat API (bisa diarahkan ke server tiruan untuk pengujian lewat GROQ_BASE_URL) */
const alamatApi = () => `${(env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '')}/chat/completions`;

/** Galat pemanggilan AI dengan kode status, supaya pemanggil bisa memberi pesan yang ramah. */
export class GroqError extends Error {
	/**
	 * @param {string} message
	 * @param {number} status
	 * @param {{ retryAfter?: number }} [info]
	 */
	constructor(message, status, info = {}) {
		super(message);
		this.name = 'GroqError';
		this.status = status;
		this.retryAfter = info.retryAfter ?? 0;
	}
	/** true bila penyebabnya batas pemakaian / layanan sibuk (bukan kesalahan permintaan) */
	get sibuk() {
		return this.status === 429 || this.status >= 500 || this.status === 0;
	}
}

/** Pesan untuk pengguna dari galat AI apa pun (tanpa membocorkan detail penyedia). */
export function pesanGalatAI(/** @type {unknown} */ err) {
	if (err instanceof GroqError) {
		if (err.status === 429) return 'Layanan AI sedang penuh. Coba lagi sekitar satu menit lagi ya.';
		if (err.status === 401 || err.status === 403 || err.status === -1) return 'Layanan AI belum dikonfigurasi dengan benar. Hubungi admin.';
		return 'Layanan AI sedang bermasalah. Coba lagi sebentar lagi.';
	}
	return 'Gagal memproses permintaan AI. Coba lagi sebentar lagi.';
}

/**
 * Susun urutan model yang dicoba.
 * @param {string} utama
 * @returns {string[]}
 */
export function urutanModel(utama) {
	return [utama, ...CADANGAN.filter((m) => m !== utama)];
}

/**
 * @param {object} options
 * @param {Array<{ role: string, content: string }>} options.messages
 * @param {string} [options.model]
 * @param {number} [options.temperature]
 * @param {number} [options.max_tokens]
 * @param {{ type: string }} [options.response_format]
 * @param {boolean} [options.bolehKosong]  true = jangan anggap jawaban kosong sebagai kegagalan
 * @param {string[]} [options.cadangan]  daftar model cadangan khusus (mis. untuk gambar: hanya model visi);
 *   bila diisi, GROQ_MODEL tidak menimpa model utama
 * @param {typeof fetch} [options.fetchFn]  untuk pengujian
 */
export async function groqChatCompletion({
	messages,
	model = 'openai/gpt-oss-20b',
	temperature = 0.7,
	max_tokens = 1024,
	response_format,
	bolehKosong = false,
	cadangan,
	fetchFn = fetch
}) {
	const apiKey = env.GROQ_API_KEY;
	if (!apiKey) {
		throw new GroqError('GROQ_API_KEY is not configured', -1);
	}

	const utama = cadangan ? model : env.GROQ_MODEL || MODEL_MAP[/** @type {keyof typeof MODEL_MAP} */ (model)] || model;
	const kandidat = cadangan ? [utama, ...cadangan.filter((m) => m !== utama)] : urutanModel(utama);

	/**
	 * @param {string} m
	 * @param {{ tanpaEffort?: boolean, tokenLebih?: boolean, tanpaFormat?: boolean }} [o]
	 */
	const panggil = async (m, o = {}) => {
		const penalaran = modelPenalaran(m);
		// Model penalaran butuh ruang untuk berpikir; tanpa ini jawaban bisa kosong (finish_reason "length")
		let batas = penalaran ? Math.max(max_tokens + 400, 900) : max_tokens;
		if (o.tokenLebih) batas = Math.min(batas * 2, 4096);
		/** @type {Record<string, unknown>} */
		const body = { model: m, messages, temperature, max_tokens: batas };
		if (response_format && !o.tanpaFormat) body.response_format = response_format;
		if (penalaran && !o.tanpaEffort) body.reasoning_effort = 'low';

		const ac = new AbortController();
		const timer = setTimeout(() => ac.abort(), BATAS_WAKTU_MS);
		try {
			return await fetchFn(alamatApi(), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
				body: JSON.stringify(body),
				signal: ac.signal
			});
		} finally {
			clearTimeout(timer);
		}
	};

	/** @type {GroqError | null} */
	let galatTerakhir = null;
	const mulai = Date.now();

	for (let i = 0; i < kandidat.length; i++) {
		// Fungsi serverless punya batas waktu: jangan mencoba model lain kalau sudah terlalu lama
		if (i > 0 && Date.now() - mulai > 30_000) break;
		const m = kandidat[i];
		let response;
		try {
			response = await panggil(m);
			// Parameter reasoning_effort ditolak model ini → ulangi tanpa parameter itu
			if (response.status === 400) {
				const teks = await response.text();
				if (/reasoning_effort/i.test(teks)) {
					response = await panggil(m, { tanpaEffort: true });
				} else if (response_format && /response_format|json/i.test(teks)) {
					// sebagian model (mis. visi) tidak mendukung mode JSON → ulangi tanpa; JSON tetap diminta lewat prompt
					response = await panggil(m, { tanpaFormat: true });
				} else {
					// Permintaan memang salah (mis. konteks terlalu panjang): model lain mungkin masih bisa
					galatTerakhir = new GroqError(`Groq API error: 400 ${teks.slice(0, 300)}`, 400);
					continue;
				}
			}
		} catch (e) {
			galatTerakhir = new GroqError(`Groq tidak bisa dihubungi: ${e instanceof Error ? e.message : String(e)}`, 0);
			continue;
		}

		if (response.ok) {
			let data = await response.json();
			const isi = data?.choices?.[0]?.message?.content;
			if (bolehKosong || (typeof isi === 'string' && isi.trim() !== '')) return data;

			// Jawaban kosong: biasanya token habis untuk penalaran → coba sekali lagi dengan batas lebih besar
			try {
				const ulang = await panggil(m, { tokenLebih: true });
				if (ulang.ok) {
					data = await ulang.json();
					const isi2 = data?.choices?.[0]?.message?.content;
					if (typeof isi2 === 'string' && isi2.trim() !== '') return data;
				}
			} catch {
				/* lanjut ke model berikutnya */
			}
			galatTerakhir = new GroqError(`Model ${m} mengembalikan jawaban kosong`, 502);
			continue;
		}

		const teks = await response.text().catch(() => '');
		const retryAfter = Number(response.headers?.get?.('retry-after')) || 0;
		galatTerakhir = new GroqError(`Groq API error: ${response.status} ${teks.slice(0, 300)}`, response.status, { retryAfter });

		// Kunci API salah: model lain tidak akan menolong
		if (response.status === 401 || response.status === 403) break;
		// 404 (model tidak tersedia), 429 (batas pemakaian), 5xx → coba model berikutnya
		if (i < kandidat.length - 1) {
			console.warn(`[Groq] Model "${m}" gagal (${response.status}); mencoba "${kandidat[i + 1]}"…`);
		}
	}

	throw galatTerakhir || new GroqError('Groq API error', 500);
}

/**
 * Ambil objek JSON dari jawaban model (toleran terhadap pagar kode ``` dan teks pembuka).
 * @param {unknown} isi
 * @returns {any | null}
 */
export function bacaJsonAI(isi) {
	if (typeof isi !== 'string') return null;
	let teks = isi.trim();
	if (!teks) return null;
	const pagar = /```(?:json)?\s*([\s\S]*?)```/i.exec(teks);
	if (pagar) teks = pagar[1].trim();
	try {
		return JSON.parse(teks);
	} catch {
		/* cari kurung terluar */
	}
	const a = teks.search(/[{[]/);
	if (a === -1) return null;
	const tutup = teks[a] === '{' ? '}' : ']';
	const b = teks.lastIndexOf(tutup);
	if (b <= a) return null;
	try {
		return JSON.parse(teks.slice(a, b + 1));
	} catch {
		return null;
	}
}
