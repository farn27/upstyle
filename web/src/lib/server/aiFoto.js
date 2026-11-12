/**
 * Foto ke AI: membaca nota/struk belanja, struk penjualan, bukti transfer, catatan kas tulisan tangan,
 * daftar harga, atau foto lain, lalu mengubahnya menjadi kartu transaksi yang bisa disimpan.
 *
 * Hemat token:
 *  - gambar dikecilkan (maks 1280 px, JPEG 80) dan diputar sesuai EXIF sebelum dikirim;
 *  - keluaran model berupa JSON ringkas (bukan paragraf);
 *  - hasil di-cache per sidik foto (SHA-256) 24 jam → foto yang sama dikirim ulang = 0 token;
 *  - pemilihan akun, metode bayar, dan validasi total dilakukan dengan aturan di server (tanpa model).
 */
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { groqChatCompletion, bacaJsonAI } from '$lib/server/groq';
import { metodeDariTeks, pilihAkunKas, akunLawanDefault } from '$lib/server/aiTransaksi';
import { ambilCache, simpanCache } from '$lib/server/aiCache';
import { log } from '$lib/server/logger';

export const MODEL_VISI = () => env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const CADANGAN_VISI = ['meta-llama/llama-4-maverick-17b-128e-instruct'];
const MAKS_BYTE = 8 * 1024 * 1024;

export const JENIS = /** @type {const} */ (['nota_belanja', 'struk_penjualan', 'bukti_transfer', 'catatan_kas', 'daftar_harga', 'lainnya']);
const LABEL_JENIS = {
	nota_belanja: 'Nota belanja',
	struk_penjualan: 'Struk penjualan',
	bukti_transfer: 'Bukti transfer',
	catatan_kas: 'Catatan kas',
	daftar_harga: 'Daftar harga',
	lainnya: 'Foto'
};
const LABEL_METODE = { TUNAI: 'Tunai', BANK: 'Transfer', QRIS: 'QRIS', MERCHANT: 'Transfer' };

const SISTEM = `Kamu membaca FOTO dokumen usaha UMKM Indonesia. Balas HANYA JSON valid, tanpa teks lain:
{"jenis":"nota_belanja|struk_penjualan|bukti_transfer|catatan_kas|daftar_harga|lainnya","toko":"nama toko/pihak lain atau null","tanggal":"YYYY-MM-DD atau null","metode":"tunai|transfer|qris|null","total":0,"items":[{"nama":"","qty":1,"harga":0,"subtotal":0}],"transaksi":[{"kategori":"Masuk|Keluar","nominal":0,"keterangan":"","tanggal":"YYYY-MM-DD atau null"}],"arah":"masuk|keluar|null","deskripsi":"1 kalimat isi foto","terbaca":0}
ATURAN:
- nota_belanja = bukti membeli barang/jasa (pengeluaran). struk_penjualan = struk kasir milik usaha ini (pemasukan). bukti_transfer = layar/struk transfer/QRIS; isi "arah" bila jelas uang masuk atau keluar. catatan_kas = tulisan tangan berisi beberapa pemasukan/pengeluaran → isi "transaksi". daftar_harga = menu/daftar harga.
- Angka rupiah sebagai bilangan bulat tanpa titik/koma (Rp45.500 → 45500). Jangan mengarang angka yang tidak terlihat; pakai 0 / null.
- "total" = total yang tertulis (setelah diskon/pajak). Maksimal 30 item.
- "terbaca" = keyakinanmu 0-100 bahwa teks terbaca jelas.`;

/**
 * Kecilkan & normalkan gambar.
 * @param {Buffer} buffer
 */
export async function siapkanGambar(buffer) {
	if (!buffer?.length) throw new Error('Gambar kosong');
	if (buffer.length > MAKS_BYTE) throw new Error('Ukuran gambar maksimal 8 MB');
	const meta = await sharp(buffer).metadata().catch(() => null);
	if (!meta?.width) throw new Error('File bukan gambar yang bisa dibaca');
	return sharp(buffer).rotate().resize(1280, 1280, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
}

/** "45.500" | "Rp 45,500" | 45500 → 45500 */
export function angka(/** @type {unknown} */ v) {
	if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : 0;
	const s = String(v ?? '').replace(/[^\d,.-]/g, '');
	if (!s) return 0;
	// titik/koma sebagai pemisah ribuan bila diikuti tepat 3 digit
	const bersih = s.replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.');
	const n = Number(bersih);
	return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * Tanggal dari nota hanya dipakai bila masuk akal (tidak di masa depan, ≤ 90 hari lalu).
 * @param {unknown} v @param {string} hariIni
 */
export function tanggalValid(v, hariIni) {
	const s = String(v || '');
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) return hariIni;
	const selisih = (Date.parse(hariIni) - Date.parse(s)) / 86_400_000;
	return selisih < 0 || selisih > 90 ? hariIni : s;
}

/**
 * @typedef {{ nama: string, qty: number, harga: number, subtotal: number }} ItemFoto
 * @typedef {{ kategori: 'Masuk' | 'Keluar', nominal: number, keterangan: string, tanggal: string | null }} TrxFoto
 * @typedef {{ jenis: typeof JENIS[number], toko: string | null, tanggal: string | null, metode: string | null, total: number,
 *   items: ItemFoto[], transaksi: TrxFoto[], arah: 'masuk' | 'keluar' | null, deskripsi: string, terbaca: number }} HasilFoto
 */

/**
 * Rapikan JSON model.
 * @param {any} j
 * @returns {HasilFoto}
 */
export function normalkan(j) {
	const jenis = JENIS.includes(j?.jenis) ? j.jenis : 'lainnya';
	const items = (Array.isArray(j?.items) ? j.items : []).slice(0, 30).map((/** @type {any} */ x) => {
		const qty = Math.max(1, angka(x?.qty) || 1);
		const harga = angka(x?.harga);
		const subtotal = angka(x?.subtotal) || qty * harga;
		return { nama: String(x?.nama || '').trim().slice(0, 60), qty, harga, subtotal };
	}).filter((/** @type {any} */ x) => x.nama && (x.subtotal > 0 || x.harga > 0));
	const transaksi = (Array.isArray(j?.transaksi) ? j.transaksi : []).slice(0, 20).map((/** @type {any} */ t) => ({
		kategori: /** @type {'Masuk' | 'Keluar'} */ (/^masuk$/i.test(String(t?.kategori || '').trim()) ? 'Masuk' : 'Keluar'),
		nominal: angka(t?.nominal),
		keterangan: String(t?.keterangan || '').trim().slice(0, 60),
		tanggal: t?.tanggal ?? null
	})).filter((/** @type {any} */ t) => t.nominal > 0);
	return {
		jenis: /** @type {typeof JENIS[number]} */ (jenis),
		toko: j?.toko ? String(j.toko).trim().slice(0, 50) : null,
		tanggal: j?.tanggal ?? null,
		metode: ['tunai', 'transfer', 'qris'].includes(String(j?.metode || '').toLowerCase()) ? String(j.metode).toLowerCase() : null,
		total: angka(j?.total),
		items,
		transaksi,
		arah: /^masuk$/i.test(String(j?.arah || '')) ? 'masuk' : /^keluar$/i.test(String(j?.arah || '')) ? 'keluar' : null,
		deskripsi: String(j?.deskripsi || '').trim().slice(0, 200),
		terbaca: Math.max(0, Math.min(100, angka(j?.terbaca)))
	};
}

/**
 * Ubah hasil baca foto menjadi kartu pratinjau transaksi (akun dipilih dengan aturan yang sama dengan entri teks).
 * @param {HasilFoto} h
 * @param {any[]} coa
 * @param {string} hariIni
 */
export function keTransaksi(h, coa, hariIni) {
	const metode = metodeDariTeks(`${h.metode || ''} ${h.toko || ''}`);
	const labelMetode = LABEL_METODE[/** @type {keyof typeof LABEL_METODE} */ (metode || 'TUNAI')] || 'Tunai';
	const tanggal = tanggalValid(h.tanggal, hariIni);
	const jumlahItem = h.items.reduce((s, x) => s + x.subtotal, 0);
	/** @param {'Masuk' | 'Keluar'} kategori @param {number} nominal @param {string} ket @param {string} tgl */
	const kartu = (kategori, nominal, ket, tgl) => ({
		kategori,
		nominal,
		keterangan: ket.slice(0, 60),
		tanggal: tgl,
		metode: labelMetode,
		coa_id: akunLawanDefault(coa, kategori, ket),
		kas_coa_id: pilihAkunKas(coa, metode),
		product_id: null,
		qty: 1
	});
	if (h.jenis === 'nota_belanja' || h.jenis === 'struk_penjualan' || (h.jenis === 'bukti_transfer' && !h.transaksi.length)) {
		const nominal = h.total || jumlahItem;
		if (!(nominal > 0)) return [];
		const kategori = h.jenis === 'struk_penjualan' || (h.jenis === 'bukti_transfer' && h.arah === 'masuk') ? 'Masuk' : 'Keluar';
		const isi = h.items.slice(0, 3).map((x) => x.nama).join(', ') + (h.items.length > 3 ? ` +${h.items.length - 3}` : '');
		const awal = kategori === 'Keluar' ? (h.jenis === 'bukti_transfer' ? 'Transfer' : 'Belanja') : h.jenis === 'bukti_transfer' ? 'Terima transfer' : 'Penjualan';
		const ket = `${awal}${h.toko ? ` ${h.toko}` : ''}${isi ? `: ${isi}` : ''}`;
		return [kartu(kategori, nominal, ket, tanggal)];
	}
	if (h.transaksi.length) return h.transaksi.map((t) => kartu(/** @type {'Masuk' | 'Keluar'} */ (t.kategori), t.nominal, t.keterangan || (t.kategori === 'Masuk' ? 'Pemasukan' : 'Pengeluaran'), tanggalValid(t.tanggal, tanggal)));
	return [];
}

/**
 * Susun balasan chat dari hasil baca foto.
 * @param {HasilFoto} h
 * @param {ReturnType<typeof keTransaksi>} kartu
 */
export function susunBalasan(h, kartu) {
	const rp = (/** @type {number} */ n) => `Rp${Math.round(n).toLocaleString('id-ID')}`;
	/** @type {string[]} */
	const bagian = [];
	bagian.push(`📷 **${LABEL_JENIS[h.jenis]}${h.toko ? ` — ${h.toko}` : ''}**${h.tanggal ? ` · ${h.tanggal}` : ''}`);
	if (h.deskripsi && h.jenis === 'lainnya') bagian.push(h.deskripsi);
	if (h.items.length) {
		const baris = h.items.slice(0, 12).map((x) => `| ${x.nama} | ${x.qty} | ${rp(x.harga || x.subtotal / x.qty)} | ${rp(x.subtotal)} |`);
		bagian.push(`| Item | Qty | Harga | Subtotal |\n|---|---|---|---|\n${baris.join('\n')}${h.items.length > 12 ? `\n| … ${h.items.length - 12} item lain | | | |` : ''}`);
	}
	const jumlahItem = h.items.reduce((s, x) => s + x.subtotal, 0);
	if (h.total) bagian.push(`**Total: ${rp(h.total)}**`);
	if (h.total && jumlahItem && Math.abs(jumlahItem - h.total) / h.total > 0.02) {
		bagian.push(`:::alert{type:"warning",title:"Cek ulang total",msg:"Jumlah item ${rp(jumlahItem)} berbeda dengan total ${rp(h.total)} (mungkin ada diskon, pajak, atau angka yang salah baca)."}:::`);
	}
	if (h.terbaca && h.terbaca < 60) bagian.push(`:::alert{type:"info",title:"Foto kurang jelas",msg:"Sebagian teks sulit dibaca. Periksa nominal sebelum menyimpan, atau foto ulang dengan cahaya cukup dan tidak miring."}:::`);
	if (kartu.length) bagian.push(kartu.length > 1 ? `Saya buatkan **${kartu.length} transaksi** — periksa akun di setiap kartu lalu simpan 👇` : 'Akun sudah saya pilihkan — periksa lalu simpan 👇');
	else if (h.jenis === 'daftar_harga') bagian.push('Ini daftar harga, jadi tidak saya catat sebagai transaksi. Gunakan untuk menambah/memperbarui harga produk di halaman Produk.');
	else bagian.push('Tidak ada nominal transaksi yang bisa saya catat dari foto ini.');
	return bagian.join('\n\n');
}

/**
 * Baca foto dengan model visi (atau dari cache bila foto yang sama pernah dibaca).
 * @param {Buffer} gambar  sudah melalui siapkanGambar()
 * @param {{ pertanyaan?: string, panggil?: typeof groqChatCompletion }} [opsi]
 * @returns {Promise<{ hasil: ReturnType<typeof normalkan>, dariCache: boolean }>}
 */
export async function bacaFoto(gambar, opsi = {}) {
	const pertanyaan = String(opsi.pertanyaan || '').trim().slice(0, 300);
	const sidik = createHash('sha256').update(gambar).digest('hex');
	const kunci = `ai:foto:${sidik.slice(0, 40)}:${createHash('sha256').update(pertanyaan).digest('hex').slice(0, 8)}`;
	const ada = await ambilCache(kunci);
	if (ada) return { hasil: normalkan(JSON.parse(ada)), dariCache: true };

	const panggil = opsi.panggil || groqChatCompletion;
	const mulai = Date.now();
	const res = await panggil({
		model: MODEL_VISI(),
		cadangan: CADANGAN_VISI,
		messages: [
			{ role: 'system', content: SISTEM },
			{
				role: 'user',
				content: /** @type {any} */ ([
					{ type: 'text', text: pertanyaan ? `Baca foto ini. Pertanyaan pengguna: ${pertanyaan}` : 'Baca foto ini.' },
					{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${gambar.toString('base64')}` } }
				])
			}
		],
		temperature: 0,
		max_tokens: 1200,
		response_format: { type: 'json_object' }
	});
	const u = res?.usage || {};
	log.ai.info({ jenis: 'foto', model: res?.model, prompt: u.prompt_tokens, completion: u.completion_tokens, total: u.total_tokens, ms: Date.now() - mulai, kb: Math.round(gambar.length / 1024) }, '[Foto] Pemakaian token');
	const json = bacaJsonAI(res?.choices?.[0]?.message?.content);
	if (!json || typeof json !== 'object') throw new Error('Foto tidak bisa dibaca. Coba foto ulang dengan lebih jelas.');
	await simpanCache(kunci, JSON.stringify(json), 24 * 3600);
	return { hasil: normalkan(json), dariCache: false };
}
