import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { groqChatCompletion, GroqError, pesanGalatAI, bacaJsonAI } from '$lib/server/groq';
import { and, asc, eq } from 'drizzle-orm';
import { log } from '$lib/server/logger';
import { cekKuotaAI } from '$lib/server/rateLimit';
import { getAiMemories, saveAiMemory, deleteAiMemory, clearAllAiMemories, isFinancialOrTransactionData } from '$lib/server/aiMemory';
import { uraikanTransaksi, metodeDariTeks, pilihAkunKas, akunLawanDefault, nominalDariTeks } from '$lib/server/aiTransaksi';
import {
	sapaan,
	deteksiTopik,
	topikSusulan,
	periodeDariTeks,
	perintahTransaksi,
	perintahIngat,
	jumlahNominal,
	rapikanRiwayat,
	halamanRelevan,
	saringTautan,
	kalender,
	namaHari
} from '$lib/server/chatKonteks';
import { kumpulkanData } from '$lib/server/chatData';
import { jawabInstan } from '$lib/server/chatInstan';
import { analisisUnit } from '$lib/server/analitik';
import { kunciCache, ambilCache, simpanCache } from '$lib/server/aiCache';
import { unitBisnis, chartOfAccounts } from '$lib/server/schema';

const MAKS_PESAN = 1000;

/** Label metode bayar di kartu transaksi (web: Tunai/Transfer/QRIS/Kartu Debit) */
const LABEL_METODE = { TUNAI: 'Tunai', BANK: 'Transfer', QRIS: 'QRIS', MERCHANT: 'Transfer' };

/**
 * @param {unknown} data
 * @param {ResponseInit} [init]
 */
const balas = (data, init) => json(data, init);

// ─── Prompt ─────────────────────────────────────────────────────────────────

/**
 * Prompt sistem ringkas. Aturan inti dijaga pendek karena dikirim di setiap pertanyaan.
 * @param {{ waktu: string, unit: string, data: string, halaman: {label: string, path: string}[], memori: string, umum: boolean }} p
 */
function promptSistem(p) {
	const aturan = p.umum
		? 'Kamu Bizgrow AI, asisten aplikasi Bizgrow untuk pemilik UMKM. Balas singkat, ramah, Bahasa Indonesia, sapa "kak". Jangan menyebut angka usaha apa pun karena data tidak disertakan; tawarkan bantuan (cek omzet, stok, mencatat transaksi lewat chat seperti "catat beli gula 50rb").'
		: `Kamu Bizgrow AI, asisten bisnis untuk pemilik UMKM. Bahasa Indonesia santai-sopan, sapa "kak".
ATURAN:
1. Jawab pertanyaan TERAKHIR secara langsung di kalimat pertama, lalu maksimal 3 poin pendukung. Riwayat hanya untuk memahami maksud.
2. Angka HANYA dari DATA di bawah, tulis persis (format Rp1.250.000). Jangan menjumlah ulang angka yang sudah tersedia. Persentase/selisih boleh dihitung dari angka DATA.
3. Jika data yang dibutuhkan tidak ada di DATA, katakan terus terang dan arahkan ke halaman yang tepat. Jangan mengarang produk, nama, tanggal, atau angka.
4. Bila relevan beri 1 saran tindakan yang konkret dan masuk akal untuk usaha kecil.
5. Tautan hanya dari HALAMAN, format [Label](/path), maksimal 2, di akhir jawaban.
6. Kamu tidak bisa mengubah data. Untuk mencatat transaksi, minta pengguna mengetik perintah seperti "catat beli gula 50rb".
Widget opsional (maks 3): :::metric{label:"Omzet",value:"Rp1.250.000",trend:"+8%",color:"green"}::: :::alert{type:"warning",title:"Judul",msg:"Isi"}:::`;
	const hal = p.halaman.length ? `\nHALAMAN: ${p.halaman.map((h) => `${h.label}=${h.path}`).join('; ')}` : '';
	const data = p.umum ? '' : `\nDATA:\n${p.data || '(tidak ada data relevan untuk pertanyaan ini)'}`;
	return `${aturan}\n\nWAKTU: ${p.waktu} WIB\nUNIT: ${p.unit}${p.memori}${data}${hal}`;
}

/** Memori pengguna sebagai baris ringkas. */
function teksMemori(/** @type {{ fact: string }[]} */ memori) {
	if (!Array.isArray(memori) || !memori.length) return '';
	return `\nPREFERENSI PENGGUNA (bukan sumber angka): ${memori.slice(0, 10).map((m) => m.fact).join(' | ')}`;
}

/** Saran pertanyaan lanjutan bila pemuat data tidak memberi saran. */
function saranBawaan(/** @type {string[]} */ topik) {
	if (topik.includes('bantuan')) return ['Cara mencatat transaksi lewat chat', 'Cara menambah produk'];
	if (topik.includes('produk')) return ['Produk terlaris bulan ini', 'Stok yang hampir habis'];
	return ['Omzet hari ini', 'Pengeluaran terbesar bulan ini', 'Produk terlaris'];
}

// ─── Transaksi dari chat ────────────────────────────────────────────────────

/**
 * Ubah perintah transaksi menjadi kartu pratinjau. Kalimat dengan satu nominal memakai pengurai yang sama
 * dengan form entri (uraikanTransaksi: produk, akun lawan, akun kas sesuai metode bayar); kalimat berisi
 * beberapa nominal dipecah oleh model, lalu akunnya dipilih dengan aturan yang sama.
 * @param {number} unitId
 * @param {string} pesan
 * @param {string} tanggal  YYYY-MM-DD
 */
async function pratinjauTransaksi(unitId, pesan, tanggal) {
	if (jumlahNominal(pesan) <= 1) {
		const u = await uraikanTransaksi(db, unitId, pesan, { panggilAI: panggilDanCatat('transaksi') });
		if (!(u.nominal > 0)) return [];
		return [{
			kategori: u.kategori,
			nominal: u.nominal,
			keterangan: u.catatan,
			tanggal,
			metode: LABEL_METODE[/** @type {keyof typeof LABEL_METODE} */ (u.metode)] || 'Tunai',
			coa_id: u.coa_id,
			kas_coa_id: u.kas_coa_id,
			product_id: u.product_id,
			qty: u.qty
		}];
	}

	const coa = await db
		.select({ id: chartOfAccounts.id, kodeAkun: chartOfAccounts.kodeAkun, namaAkun: chartOfAccounts.namaAkun, tipeAkun: chartOfAccounts.tipeAkun, deskripsi: chartOfAccounts.deskripsi })
		.from(chartOfAccounts)
		.where(and(eq(chartOfAccounts.unitId, unitId), eq(chartOfAccounts.isActive, 1)))
		.orderBy(asc(chartOfAccounts.kodeAkun));
	/** @type {any[]} */
	let daftar = [];
	try {
		const res = await panggilDanCatat('transaksi-multi')({
			model: 'openai/gpt-oss-20b',
			messages: [
				{
					role: 'system',
					content: 'Pecah kalimat menjadi daftar transaksi UMKM. Balas HANYA JSON: {"transaksi":[{"kategori":"Masuk|Keluar","nominal":50000,"keterangan":"maks 40 karakter","metode":"tunai|transfer|qris"}]}. Masuk = penjualan/uang diterima; Keluar = pembelian/biaya. 15k=15000, 50rb=50000, 1,5jt=1500000.'
				},
				{ role: 'user', content: pesan }
			],
			temperature: 0,
			max_tokens: 400,
			response_format: { type: 'json_object' }
		});
		const isi = bacaJsonAI(res?.choices?.[0]?.message?.content);
		daftar = Array.isArray(isi?.transaksi) ? isi.transaksi : Array.isArray(isi) ? isi : [];
	} catch (e) {
		log.ai.warn({ err: e instanceof Error ? e.message : String(e) }, '[Chat] Pecah transaksi gagal');
	}
	return daftar
		.slice(0, 10)
		.map((x) => {
			const kategori = /^keluar$/i.test(String(x?.kategori || '').trim()) ? 'Keluar' : 'Masuk';
			const ket = String(x?.keterangan || '').trim().slice(0, 60) || (kategori === 'Masuk' ? 'Pemasukan' : 'Pengeluaran');
			const metode = metodeDariTeks(`${x?.metode || ''} ${pesan}`);
			const nominal = Math.round(Number(x?.nominal) || nominalDariTeks(ket));
			return {
				kategori,
				nominal,
				keterangan: ket,
				tanggal,
				metode: LABEL_METODE[/** @type {keyof typeof LABEL_METODE} */ (metode || 'TUNAI')] || 'Tunai',
				coa_id: akunLawanDefault(/** @type {any} */ (coa), kategori, ket),
				kas_coa_id: pilihAkunKas(/** @type {any} */ (coa), metode),
				product_id: null,
				qty: 1
			};
		})
		.filter((x) => x.nominal > 0);
}

// ─── Pemanggilan model + pencatatan token ───────────────────────────────────

/**
 * Bungkus groqChatCompletion dengan log pemakaian token per jenis permintaan.
 * @param {string} jenis
 * @returns {typeof groqChatCompletion}
 */
function panggilDanCatat(jenis) {
	return async (opsi) => {
		const mulai = Date.now();
		const res = await groqChatCompletion(opsi);
		const u = res?.usage || {};
		log.ai.info({ jenis, model: res?.model || opsi.model, prompt: u.prompt_tokens, completion: u.completion_tokens, total: u.total_tokens, ms: Date.now() - mulai }, '[Chat] Pemakaian token');
		return res;
	};
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function POST({ request, cookies }) {
	try {
		const userId = await getCurrentUserId(cookies, request);
		if (!userId) return balas({ reply: 'Sesi tidak valid, silakan login ulang ya kak.' }, { status: 401 });

		/** @type {any} */
		let body;
		try {
			body = await request.json();
		} catch {
			return balas({ reply: 'Format permintaan tidak valid.' }, { status: 400 });
		}
		const pesan = String(body?.message || '').trim().slice(0, MAKS_PESAN);
		if (!pesan) return balas({ reply: 'Pesan tidak boleh kosong.' }, { status: 400 });
		const slugAktif = typeof body?.activeUnitSlug === 'string' && body.activeUnitSlug ? body.activeUnitSlug : null;

		// Kuota AI hanya dipotong saat model benar-benar dipanggil (perintah memori & jawaban instan gratis)
		const cekKuota = async () => {
			const k = await cekKuotaAI(userId);
			return k.allowed ? null : balas({ reply: k.pesan }, { status: 429 });
		};

		// Unit milik pengguna (unit aktif harus milik pengguna)
		const semuaUnit = await db
			.select({ id: unitBisnis.id, nama_unit: unitBisnis.namaUnit, slug: unitBisnis.slug, modal_awal: unitBisnis.modalAwal, kategori: unitBisnis.kategori })
			.from(unitBisnis)
			.where(eq(unitBisnis.userId, userId));
		if (!semuaUnit.length) return balas({ reply: 'Data unit bisnis tidak ditemukan. Silakan buat unit bisnis terlebih dahulu ya kak.', suggestions: [] });
		const unit = slugAktif ? semuaUnit.find((u) => u.slug === slugAktif) || null : semuaUnit.length === 1 ? semuaUnit[0] : null;
		if (slugAktif && !unit) return balas({ reply: 'Unit bisnis yang dipilih tidak ditemukan. Pilih ulang unitnya ya kak.', suggestions: [] });
		const unitId = unit?.id ?? null;

		const kal = kalender();
		const riwayat = rapikanRiwayat(body?.history, pesan);

		// ── 1. Perintah memori (tanpa memanggil model) ──
		if (/^(apa\s+saja\s+(yang\s+)?(kamu\s+)?ingat|kamu\s+ingat\s+apa|daftar\s+memori|cek\s+memori|memori\s+saya)\b/i.test(pesan)) {
			const memori = await getAiMemories(unitId, userId);
			return balas({
				reply: memori.length
					? `🧠 **Yang saya ingat:**\n\n${memori.map((m, i) => `${i + 1}. ${m.fact}`).join('\n')}\n\n💡 Tambah dengan "Ingat bahwa …" atau hapus dengan "Lupakan memori tentang …".`
					: '🧠 **Belum ada memori yang disimpan kak.**\n\nContoh: *"Ingat bahwa toko kami libur setiap hari Minggu"* atau *"Ingat, jawab singkat saja"*.\n\n*(Angka keuangan tidak disimpan di memori karena selalu dibaca langsung dari basis data.)*',
				suggestions: memori.length ? ['Lupakan memori…', 'Omzet hari ini'] : ['Ingat bahwa toko libur hari Minggu', 'Omzet hari ini']
			});
		}
		if (/^(reset\s+semua\s+memori|hapus\s+semua\s+(memori|ingatan)|bersihkan\s+memori)\b/i.test(pesan)) {
			await clearAllAiMemories(unitId, userId);
			return balas({ reply: '🧹 **Seluruh memori AI sudah dibersihkan kak.**', suggestions: ['Apa saja yang kamu ingat?', 'Omzet hari ini'] });
		}
		const hapus = pesan.match(/^(?:tolong\s+)?(?:lupakan|hapus)\s+(?:memori|ingatan)\s*(?:tentang\s*)?[:,-]?\s*(.+)/i);
		if (hapus) {
			const kata = hapus[1].trim();
			const { removedCount } = await deleteAiMemory(unitId, userId, kata);
			return balas({
				reply: removedCount > 0 ? `🗑️ **Memori dihapus kak.** ${removedCount} memori tentang *"${kata}"* sudah saya lupakan.` : `Tidak ada memori yang cocok dengan *"${kata}"* kak. Ketik *"Apa saja yang kamu ingat?"* untuk melihat daftarnya.`,
				suggestions: ['Apa saja yang kamu ingat?']
			});
		}

		// ── 2. Perintah mencatat transaksi → kartu pratinjau ──
		if (perintahTransaksi(pesan)) {
			if (!unitId) {
				return balas({ reply: 'Transaksi ini mau dicatat ke unit bisnis yang mana kak? Pilih unitnya dulu di atas kolom chat, lalu kirim ulang perintahnya ya.', suggestions: [], needsUnit: true });
			}
			const tolak = await cekKuota();
			if (tolak) return tolak;
			const tanggal = /\b(kemarin|kmrn|kemaren)\b/i.test(pesan) ? kal.kemarin : kal.hariIni;
			const previews = await pratinjauTransaksi(unitId, pesan, tanggal);
			if (!previews.length) {
				return balas({ reply: 'Nominalnya berapa kak? Contoh: *"catat beli gula 50rb"* atau *"jual 2 kopi susu"*.', suggestions: ['Catat beli gula 50rb'] });
			}
			const satu = previews[0];
			return balas({
				reply:
					previews.length > 1
						? `✅ **${previews.length} transaksi** terdeteksi kak. Periksa akunnya di setiap kartu, lalu simpan ya 👇`
						: `${satu.kategori === 'Masuk' ? '💰 **Pemasukan' : '💸 **Pengeluaran'} Rp${Number(satu.nominal).toLocaleString('id-ID')}** terdeteksi kak. Akun sudah saya pilihkan sesuai metode bayar — periksa lalu simpan ya 👇`,
				transactionPreviews: previews,
				suggestions: ['Input transaksi lain', 'Lihat riwayat transaksi'],
				intent: 'transaksi'
			});
		}

		// ── 3. Simpan memori ──
		const fakta = perintahIngat(pesan);
		if (fakta) {
			if (isFinancialOrTransactionData(fakta)) {
				return balas({
					reply: '⚠️ **Angka transaksi & keuangan tidak disimpan di memori kak**, supaya angka lama tidak tertukar dengan data terbaru. Angka selalu saya baca langsung dari basis data.\n\nMemori dipakai untuk konteks seperti hari libur, nama supplier langganan, atau gaya jawaban. Kalau maksudnya mencatat transaksi, ketik misalnya *"catat beli gula 50rb"*.',
					suggestions: ['Ingat bahwa toko libur hari Minggu', 'Catat beli gula 50rb']
				});
			}
			const simpan = await saveAiMemory(unitId, userId, fakta, 'context');
			return balas({
				reply: simpan.success ? `🧠 **Tersimpan kak.** Saya akan ingat: *"${fakta}"*` : `Gagal menyimpan memori: ${simpan.message}`,
				suggestions: ['Apa saja yang kamu ingat?']
			});
		}

		// ── 4. Pertanyaan → kumpulkan data yang relevan saja ──
		const basaBasi = sapaan(pesan);
		let topik = basaBasi ? [] : deteksiTopik(pesan);
		let periode = periodeDariTeks(pesan);
		let susulan = false;
		if (!basaBasi && (!topik.length || !periode.length)) {
			const susulanTopik = topikSusulan(pesan, riwayat);
			if (!topik.length && susulanTopik.length) {
				topik = susulanTopik;
				susulan = true;
			}
			// "kalau minggu lalu?" sudah punya periode; "kenapa?" mewarisi periode pertanyaan sebelumnya
			if (!periode.length && susulanTopik.length) {
				const userSebelum = [...riwayat].reverse().find((h) => h.role === 'user');
				if (userSebelum && pesan.split(/\s+/).length <= 8) periode = periodeDariTeks(userSebelum.content);
			}
		}
		const hanyaBantuan = topik.length === 1 && topik[0] === 'bantuan';
		const umum = basaBasi;

		// ── 5. Jawaban instan dari basis data (0 token) untuk pertanyaan fakta sederhana ──
		if (!umum && !susulan) {
			const instan = await jawabInstan({ pesan, unit, unitIds: semuaUnit.map((u) => u.id), topik, periode });
			if (instan) {
				log.ai.info({ jenis: instan.intent, prompt: 0, completion: 0, total: 0 }, '[Chat] Jawaban instan tanpa model');
				return balas({ reply: saringTautan(instan.reply, unit?.slug ?? null), suggestions: instan.suggestions, chartData: instan.chartData ?? null, transactionPreviews: null, intent: instan.intent });
			}
		}

		const [{ data, saran, grafik: grafikData }, memori] = await Promise.all([
			umum || hanyaBantuan
				? Promise.resolve({ data: '', saran: [], grafik: null })
				: kumpulkanData({ unit, unitIds: semuaUnit.map((u) => u.id), userId, pesan: susulan ? `${riwayat.filter((h) => h.role === 'user').slice(-1)[0]?.content || ''} ${pesan}` : pesan, topik, periode }),
			getAiMemories(unitId, userId)
		]);

		// Pertanyaan "kenapa / saran / strategi": sertakan temuan mesin analisis statistik (sudah dihitung,
		// cache per sidik data) supaya jawaban AI berdasar penyebab nyata — tambahan token kecil (±150)
		let temuan = '';
		if (unit && !umum && !hanyaBantuan && /\b(kenapa|mengapa|knp|penyebab|saran|sarankan|strategi|tips|rekomendasi|evaluasi|analisis|analisa|tingkatkan|naikkan|meningkatkan|perbaiki|harus\s+apa|lakukan\s+apa|prioritas)\b/i.test(susulan ? `${riwayat.filter((h) => h.role === 'user').slice(-1)[0]?.content || ''} ${pesan}` : pesan)) {
			try {
				const a = await analisisUnit(unit);
				temuan = `\nTEMUAN ANALISIS STATISTIK (sudah dihitung; boleh dikutip):\n- ${a.ringkasan}\n${a.wawasan.slice(0, 6).map((/** @type {any} */ w) => `- ${w.judul}: ${w.isi}${w.aksi ? ` Saran: ${w.aksi}` : ''}`).join('\n')}`;
			} catch {
				/* pelengkap */
			}
		}

		const panduan = hanyaBantuan
			? '\nPANDUAN: Catat transaksi → halaman Catat Transaksi (tombol "Tambah Transaksi" di Dasbor) atau ketik di chat, mis. "catat beli gula 50rb". Jualan → halaman Kasir. Tambah produk → halaman Tambah Produk. Karyawan → halaman SDM. Tambah unit usaha → menu Operasional, tombol "Unit Baru". Laporan laba rugi → Laporan Keuangan.'
			: '';
		const sistem = promptSistem({
			waktu: `${namaHari(kal.hariKe)}, ${kal.hariIni} ${kal.jam}`,
			unit: unit ? `${unit.nama_unit}${unit.kategori ? ` (${unit.kategori})` : ''}` : `belum dipilih — data gabungan ${semuaUnit.length} unit: ${semuaUnit.map((u) => u.nama_unit).join(', ')}`,
			// satu sumber proyeksi: bila temuan mesin disertakan, buang proyeksi linier sederhana
			data: (temuan ? data.replace(/\n- Proyeksi akhir bulan \(laju[^\n]*/, '') : data) + temuan + panduan,
			halaman: umum ? [] : halamanRelevan(unit?.slug ?? null, topik),
			memori: teksMemori(memori),
			umum
		});

		const permintaan = {
			// Sapaan & panduan cukup model kecil (batas token per menit dihitung per model → beban terbagi)
			model: umum || hanyaBantuan ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile',
			messages: [{ role: 'system', content: sistem }, ...(umum ? riwayat.slice(-2) : riwayat), { role: 'user', content: pesan }],
			temperature: 0.3,
			max_tokens: umum ? 200 : 600
		};
		// Pertanyaan yang sama dengan data yang sama (prompt identik) → pakai jawaban sebelumnya, tanpa token.
		// Waktu dalam prompt dibulatkan ke jam supaya kunci tidak berubah tiap menit.
		const kunci = kunciCache({ ...permintaan, messages: permintaan.messages.map((x, i) => (i === 0 ? { ...x, content: x.content.replace(/(WAKTU: [^\n]*? \d{2}):\d{2}/, '$1') } : x)), unitId, userId });
		let isiJawaban = await ambilCache(kunci);
		if (isiJawaban) {
			log.ai.info({ jenis: 'cache', prompt: 0, completion: 0, total: 0 }, '[Chat] Jawaban dari cache');
		} else {
			const tolak = await cekKuota();
			if (tolak) return tolak;
			const res = await panggilDanCatat(umum ? 'sapaan' : hanyaBantuan ? 'bantuan' : 'analitis')(permintaan);
			isiJawaban = String(res?.choices?.[0]?.message?.content || '').trim();
			if (isiJawaban) await simpanCache(kunci, isiJawaban, 600);
		}

		let reply = isiJawaban || 'Maaf kak, AI sedang sibuk. Coba lagi sebentar ya! 😊';

		// Grafik opsional dari model
		/** @type {any} */
		let chartData = null;
		const grafik = reply.match(/```chart\s*(\{[\s\S]*?\})\s*```/);
		if (grafik) {
			try {
				chartData = JSON.parse(grafik[1]);
			} catch {
				/* abaikan */
			}
			reply = reply.replace(/```chart[\s\S]*?```/, '').trim();
		}
		// Blok transaksi tidak boleh muncul dari jawaban analitis (pencatatan lewat jalur perintah di atas)
		reply = reply.replace(/```transaction[\s\S]*?```/g, '').trim();
		reply = saringTautan(reply, unit?.slug ?? null);

		return balas({
			reply,
			suggestions: saran.length ? saran : saranBawaan(topik),
			// Grafik dibuat server dari data (tren, rincian) bila model tidak membuatnya — tanpa token
			chartData: chartData || grafikData || null,
			transactionPreviews: null,
			intent: umum ? 'sapaan' : topik.join(',') || 'umum'
		});
	} catch (err) {
		log.ai.error({ err }, '[Chat API]');
		if (err instanceof GroqError) {
			return balas({ reply: `${pesanGalatAI(err)} 🙏`, suggestions: [], aiError: true, retryAfter: err.retryAfter || 60 });
		}
		return balas({ reply: 'Terjadi kesalahan server. Silakan coba lagi ya kak.' }, { status: 500 });
	}
}
