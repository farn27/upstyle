import { and, eq, like, sql } from 'drizzle-orm';
import { unitBisnis, kategoriProduk } from '$lib/server/schema';

/** Slug dasar dari nama unit (huruf kecil, angka, strip). */
export function slugDasar(nama) {
	return String(nama || '')
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 50) || 'unit';
}

/**
 * Slug yang belum dipakai unit lain milik user yang sama (tambah -2, -3, … bila bentrok),
 * supaya dua unit bernama sama tidak membuka halaman yang sama.
 * @param {any} db
 * @param {number} userId
 * @param {string} nama
 * @param {number} [kecualiUnitId] unit yang sedang diubah (slug miliknya sendiri tidak dihitung bentrok)
 */
export async function slugUnik(db, userId, nama, kecualiUnitId) {
	const dasar = slugDasar(nama);
	const ada = await db.select({ id: unitBisnis.id, slug: unitBisnis.slug }).from(unitBisnis)
		.where(and(eq(unitBisnis.userId, userId), like(unitBisnis.slug, `${dasar}%`)));
	const dipakai = new Set(ada.filter((u) => u.id !== kecualiUnitId).map((u) => u.slug));
	if (!dipakai.has(dasar)) return dasar;
	for (let i = 2; i < 1000; i++) if (!dipakai.has(`${dasar}-${i}`)) return `${dasar}-${i}`;
	return `${dasar}-${Date.now()}`;
}

/** Kategori produk awal sesuai kategori usaha (sama dengan pembuatan unit di web). */
export function kategoriProdukAwal(kategori) {
	const k = String(kategori || '');
	if (k.startsWith('FNB')) return ['MAKANAN', 'MINUMAN', 'SNACK', 'BAHAN BAKU'];
	if (k.includes('FASHION')) return ['ATASAN', 'BAWAHAN', 'AKSESORIS', 'SEPATU'];
	if (k.includes('RETAIL')) return ['BARANG JADI', 'ATK', 'KEBUTUHAN POKOK'];
	if (k === 'JASA_TEKNIK' || k === 'AUTOMOTIVE') return ['SPAREPART', 'OLI & CAIRAN', 'JASA / SERVICE', 'AKSESORIS KENDARAAN'];
	if (k === 'JASA_LAUNDRY') return ['LAYANAN KILOAN', 'LAYANAN SATUAN', 'PARFUM & KIMIA'];
	if (k === 'JASA_BARBER') return ['JASA PANGKAS', 'POMADE / PRODUK RAMBUT', 'TREATMENT'];
	if (k === 'HEALTH_CLINIC' || k === 'PHARMA_MEDICAL') return ['OBAT BEBAS', 'OBAT RESEP', 'ALAT KESEHATAN', 'JASA MEDIS / KONSULTASI'];
	if (k.startsWith('TECH_') || k === 'DIGITAL_AGENCY') return ['LISENSI SOFTWARE', 'JASA DEVELOPMENT', 'SUBSCRIPTION', 'MAINTENANCE'];
	if (k === 'MANUFAKTUR' || k === 'CONSTRUCTION') return ['BAHAN BAKU', 'BARANG SETENGAH JADI', 'BARANG JADI', 'MATERIAL BANGUNAN'];
	if (k === 'AGRIBISNIS') return ['HASIL PANEN', 'PUPUK & KIMIA', 'BIBIT', 'ALAT PERTANIAN'];
	if (k === 'EDUCATION_COURSE') return ['BIAYA KURSUS / SPP', 'BUKU / MODUL', 'MERCHANDISE'];
	return ['UMUM'];
}

export class UnitError extends Error {
	/** @param {string} pesan @param {number} [status] */
	constructor(pesan, status = 400) { super(pesan); this.status = status; }
}

/**
 * Buat unit bisnis (pusat atau cabang) lengkap dengan kategori produk awal.
 * Cabang wajib punya induk milik user yang sama dan mewarisi kategori induk.
 * @param {any} db
 * @param {number} userId
 * @param {{ nama: string, kategori?: string|null, alamat?: string|null, telepon?: string|null, email?: string|null, modalAwal?: number, isCabang?: boolean, cabangDari?: number|null }} d
 */
export async function buatUnit(db, userId, d) {
	const nama = String(d.nama || '').trim();
	if (nama.length < 2) throw new UnitError('Nama bisnis minimal 2 karakter');
	let kategori = d.kategori || null;
	let cabangDari = null;
	if (d.isCabang) {
		if (!d.cabangDari) throw new UnitError('Pilih unit induk untuk cabang');
		const [induk] = await db.select({ id: unitBisnis.id, kategori: unitBisnis.kategori, isCabang: unitBisnis.isCabang })
			.from(unitBisnis).where(and(eq(unitBisnis.id, Number(d.cabangDari)), eq(unitBisnis.userId, userId)));
		if (!induk) throw new UnitError('Unit induk tidak ditemukan');
		if (induk.isCabang) throw new UnitError('Cabang tidak bisa menjadi induk cabang lain');
		kategori = induk.kategori || 'LAINNYA';
		cabangDari = induk.id;
	} else if (!kategori) {
		throw new UnitError('Kategori usaha harus dipilih');
	}
	const slug = await slugUnik(db, userId, nama);
	const [res] = await db.insert(unitBisnis).values({
		userId, namaUnit: nama, slug, kategori,
		modalAwal: String(Math.max(0, Number(d.modalAwal) || 0)),
		alamat: d.alamat?.trim() || null, telepon: d.telepon?.trim() || null, email: d.email?.trim() || null,
		isCabang: d.isCabang ? 1 : 0, cabangDari
	});
	const id = res.insertId;
	if (!d.isCabang) {
		await db.insert(kategoriProduk)
			.values(kategoriProdukAwal(kategori).map((c) => ({ unitId: id, namaKategori: c })))
			.onDuplicateKeyUpdate({ set: { id: sql`id` } });
	}
	return { id, slug, kategori, cabangDari };
}
