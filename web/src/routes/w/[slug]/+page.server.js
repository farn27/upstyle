import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, products, websiteSettings } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const load = async ({ params }) => {
    const { slug } = params;

    // 1. Cari settings berdasarkan domainSlug
    let settings = await db.query.websiteSettings.findFirst({
        where: eq(websiteSettings.domainSlug, slug)
    });

    let unit = null;
    if (settings) {
        // Cari unit bisnis terkait
        unit = await db.query.unitBisnis.findFirst({
            where: eq(unitBisnis.id, settings.unitId)
        });
    } else {
        // Fallback: cari unit bisnis berdasarkan slug unitnya
        unit = await db.query.unitBisnis.findFirst({
            where: eq(unitBisnis.slug, slug)
        });

        if (!unit) {
            throw error(404, 'Toko/Website tidak ditemukan');
        }

        // Buat default settings di memory
        settings = {
            unitId: unit.id,
            domainSlug: slug,
            theme: 'modern',
            colorPrimary: '#4F46E5',
            heroTitle: `Selamat Datang di ${unit.namaUnit}`,
            heroSubtitle: 'Temukan produk-produk terbaik kami dengan harga terjangkau.',
            aboutUs: `Kami adalah unit bisnis ${unit.namaUnit} yang bergerak dibidang ${unit.kategori || 'perdagangan'}. Kami berkomitmen memberikan pelayanan terbaik bagi pelanggan kami.`,
            contactPhone: unit.telepon || '',
            contactEmail: unit.email || '',
            contactAddress: unit.alamat || '',
            isPublished: true
        };
    }

    // Ambil produk aktif yang tidak di-delete
    const activeProducts = await db.query.products.findMany({
        where: and(eq(products.unitId, unit.id), isNull(products.deletedAt), eq(products.status, 'active')),
        with: {
            kategoriProduk: true
        }
    });

    // Map categories
    const categories = Array.from(new Set(activeProducts.map(p => p.kategoriProduk?.namaKategori || 'UMUM')));

    return {
        unit,
        settings,
        products: activeProducts.map(p => ({
            id: p.id,
            nama: p.nama,
            hargaJual: Number(p.hargaJual || 0),
            stok: p.stok || 0,
            foto: p.foto || '',
            kategori: p.kategoriProduk?.namaKategori || 'UMUM'
        })),
        categories
    };
};
