import { db } from '$lib/server/drizzle';
import { products, kategoriProduk } from '$lib/server/schema';
import { and, eq, desc, isNull, asc } from 'drizzle-orm';

export const load = async ({ parent }) => {
    const { store } = await parent();

    // Halaman publik: hanya kolom yang perlu ditampilkan. Dulu seluruh baris produk dikirim ke pengunjung
    // (termasuk harga beli/modal, id pemilik, metadata) dan relasi `kategori` yang tidak ada membuat kueri gagal.
    const productsList = await db
        .select({
            id: products.id,
            slug: products.slug,
            nama: products.nama,
            foto: products.foto,
            hargaJual: products.hargaJual,
            stok: products.stok,
            kategoriId: products.kategoriId,
            namaKategori: kategoriProduk.namaKategori
        })
        .from(products)
        .leftJoin(kategoriProduk, eq(kategoriProduk.id, products.kategoriId))
        .where(and(eq(products.unitId, store.unitId), eq(products.status, 'active'), eq(products.jenis, 'BARANG_JADI'), isNull(products.deletedAt)))
        .orderBy(desc(products.createdAt));

    const categories = await db
        .select({ id: kategoriProduk.id, namaKategori: kategoriProduk.namaKategori })
        .from(kategoriProduk)
        .where(eq(kategoriProduk.unitId, store.unitId))
        .orderBy(asc(kategoriProduk.namaKategori));

    return {
        productsList: productsList.map((p) => ({ ...p, kategori: p.namaKategori ? { namaKategori: p.namaKategori } : null })),
        categories
    };
};
