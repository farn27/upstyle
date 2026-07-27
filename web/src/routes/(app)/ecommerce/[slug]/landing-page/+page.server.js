import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, landingPages, products } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

// Default template structures
const TEMPLATES = {
  promo: {
    name: 'Flash Sale',
    sections: [
      { id: 's1', type: 'hero', data: { headline: '🔥 Flash Sale Hari Ini!', subheadline: 'Diskon hingga 70% untuk semua produk pilihan', ctaText: 'Beli Sekarang', ctaColor: '#dc2626', bgColor: '#1e293b', textColor: '#ffffff', bgImage: '' } },
      { id: 's2', type: 'products', data: { title: 'Produk Unggulan', subtitle: 'Pilihan terbaik dengan harga spesial', columns: 3 } },
      { id: 's3', type: 'cta', data: { headline: 'Jangan Sampai Kehabisan!', subtext: 'Stok terbatas, pesan sekarang sebelum habis', ctaText: 'Hubungi Kami', ctaColor: '#dc2626', bgColor: '#fef2f2' } },
      { id: 's4', type: 'contact_form', data: { title: 'Hubungi Kami', subtitle: 'Isi form di bawah untuk informasi lebih lanjut' } }
    ]
  },
  leadgen: {
    name: 'Lead Generation',
    sections: [
      { id: 's1', type: 'hero', data: { headline: 'Dapatkan Penawaran Eksklusif', subheadline: 'Daftarkan diri kamu dan dapatkan promo spesial langsung di WhatsApp', ctaText: 'Daftar Sekarang', ctaColor: '#4f46e5', bgColor: '#312e81', textColor: '#ffffff', bgImage: '' } },
      { id: 's2', type: 'benefits', data: { title: 'Kenapa Pilih Kami?', items: ['✅ Kualitas Terjamin', '✅ Harga Bersaing', '✅ Pengiriman Cepat', '✅ Garansi 30 Hari'] } },
      { id: 's3', type: 'contact_form', data: { title: 'Daftar Sekarang — Gratis!', subtitle: 'Isi data kamu, tim kami akan segera menghubungi' } }
    ]
  },
  catalog: {
    name: 'Katalog Produk',
    sections: [
      { id: 's1', type: 'hero', data: { headline: 'Katalog Produk Kami', subheadline: 'Temukan produk berkualitas dengan harga terbaik', ctaText: 'Lihat Produk', ctaColor: '#059669', bgColor: '#064e3b', textColor: '#ffffff', bgImage: '' } },
      { id: 's2', type: 'about', data: { title: 'Tentang Kami', content: 'Kami adalah bisnis yang berkomitmen memberikan produk dan layanan terbaik untuk pelanggan setia kami.', imageUrl: '' } },
      { id: 's3', type: 'products', data: { title: 'Produk Kami', subtitle: 'Lihat koleksi lengkap kami', columns: 3 } },
      { id: 's4', type: 'testimonial', data: { title: 'Apa Kata Pelanggan', items: [{ name: 'Budi S.', text: 'Produknya bagus dan pengiriman cepat!', rating: 5 }, { name: 'Sari W.', text: 'Harga terjangkau, kualitas premium!', rating: 5 }] } },
      { id: 's5', type: 'contact_form', data: { title: 'Hubungi Kami', subtitle: 'Ada pertanyaan? Kami siap membantu!' } }
    ]
  },
  portfolio: {
    name: 'Portofolio / Jasa',
    sections: [
      { id: 's1', type: 'hero', data: { headline: 'Solusi Terbaik untuk Bisnis Anda', subheadline: 'Kami hadir untuk membantu bisnis kamu tumbuh lebih cepat', ctaText: 'Konsultasi Gratis', ctaColor: '#7c3aed', bgColor: '#4c1d95', textColor: '#ffffff', bgImage: '' } },
      { id: 's2', type: 'about', data: { title: 'Siapa Kami', content: 'Tim profesional dengan pengalaman bertahun-tahun di industri ini.', imageUrl: '' } },
      { id: 's3', type: 'benefits', data: { title: 'Layanan Kami', items: ['🎯 Konsultasi Bisnis', '📊 Analisis Pasar', '💡 Strategi Marketing', '🚀 Implementasi Cepat'] } },
      { id: 's4', type: 'contact_form', data: { title: 'Mulai Konsultasi', subtitle: 'Konsultasi pertama GRATIS — Isi form berikut' } }
    ]
  },
  minimal: {
    name: 'Minimalis Modern',
    sections: [
      { id: 's1', type: 'hero', data: { headline: 'Less is More', subheadline: 'Desain minimalis dengan fokus pada esensi produk', ctaText: 'Jelajahi', ctaColor: '#000000', bgColor: '#ffffff', textColor: '#000000', bgImage: '' } },
      { id: 's2', type: 'products', data: { title: 'Koleksi', subtitle: 'Produk pilihan dengan desain timeless', columns: 2 } },
      { id: 's3', type: 'about', data: { title: 'Filosofi Kami', content: 'Kami percaya bahwa kesederhanaan adalah bentuk tertinggi dari kecanggihan.', imageUrl: '' } },
      { id: 's4', type: 'contact_form', data: { title: 'Hubungi Kami', subtitle: 'Mari berdiskusi tentang proyek Anda' } }
    ]
  },
  luxury: {
    name: 'Luxury Premium',
    sections: [
      { id: 's1', type: 'hero', data: { headline: 'Excellence Redefined', subheadline: 'Koleksi premium untuk mereka yang menghargai kualitas', ctaText: 'Discover', ctaColor: '#d4af37', bgColor: '#0a0a0a', textColor: '#d4af37', bgImage: '' } },
      { id: 's2', type: 'about', data: { title: 'Heritage', content: 'Dedikasi pada keunggulan sejak generasi. Setiap karya adalah mahakarya.', imageUrl: '' } },
      { id: 's3', type: 'products', data: { title: 'Signature Collection', subtitle: 'Koleksi eksklusif terbatas', columns: 3 } },
      { id: 's4', type: 'testimonial', data: { title: 'Connoisseur Reviews', items: [{ name: 'Alexander W.', text: 'Truly exceptional craftsmanship', rating: 5 }, { name: 'Victoria L.', text: 'Worth every penny', rating: 5 }] } },
      { id: 's5', type: 'contact_form', data: { title: 'Private Consultation', subtitle: 'Schedule your exclusive viewing' } }
    ]
  },
  event: {
    name: 'Event Launch',
    sections: [
      { id: 's1', type: 'hero', data: { headline: '🎉 Grand Opening!', subheadline: 'Bergabunglah dengan kami untuk perayaan peluncuran produk baru', ctaText: 'RSVP Now', ctaColor: '#f59e0b', bgColor: '#78350f', textColor: '#ffffff', bgImage: '' } },
      { id: 's2', type: 'about', data: { title: 'About the Event', content: 'Experience the future of innovation. Be the first to witness groundbreaking technology.', imageUrl: '' } },
      { id: 's3', type: 'benefits', data: { title: 'What to Expect', items: ['🎁 Exclusive Gifts', '🍴 Refreshments', '🎤 Live Demo', '🤝 Networking'] } },
      { id: 's4', type: 'products', data: { title: 'Featured Products', subtitle: 'First look at our latest releases', columns: 3 } },
      { id: 's5', type: 'contact_form', data: { title: 'Reserve Your Spot', subtitle: 'Limited seats available - register now' } }
    ]
  },
  seasonal: {
    name: 'Seasonal Promo',
    sections: [
      { id: 's1', type: 'hero', data: { headline: '🌸 Spring Collection', subheadline: 'Refresh your style with our newest arrivals', ctaText: 'Shop Now', ctaColor: '#ec4899', bgColor: '#fdf2f8', textColor: '#831843', bgImage: '' } },
      { id: 's2', type: 'products', data: { title: 'New Arrivals', subtitle: 'Fresh picks for the season', columns: 4 } },
      { id: 's3', type: 'benefits', data: { title: 'Seasonal Benefits', items: ['🌱 Eco-friendly packaging', '🚚 Free shipping on orders over $50', '💳 Flexible payment options', '🔄 Easy returns'] } },
      { id: 's4', type: 'cta', data: { headline: 'Limited Time Offer', subtext: 'Get 20% off with code SPRING2026', ctaText: 'Apply Code', ctaColor: '#ec4899', bgColor: '#fce7f3' } },
      { id: 's5', type: 'contact_form', data: { title: 'Stay Updated', subtitle: 'Subscribe for exclusive seasonal offers' } }
    ]
  },
  webinar: {
    name: 'Webinar Registration',
    sections: [
      { id: 's1', type: 'hero', data: { headline: '📚 Free Masterclass', subheadline: 'Learn industry secrets from experts', ctaColor: '#3b82f6', bgColor: '#1e3a8a', textColor: '#ffffff', ctaText: 'Register Free', bgImage: '' } },
      { id: 's2', type: 'about', data: { title: 'What You Will Learn', content: 'Join our exclusive webinar and discover proven strategies that have helped thousands succeed.', imageUrl: '' } },
      { id: 's3', type: 'benefits', data: { title: 'Key Takeaways', items: ['📖 Expert insights', '🎯 Actionable strategies', '📋 Downloadable resources', '❓ Live Q&A session'] } },
      { id: 's4', type: 'testimonial', data: { title: 'Past Attendees Say', items: [{ name: 'Michael R.', text: 'Best webinar I have attended this year', rating: 5 }, { name: 'Jennifer K.', text: 'Immediately implemented what I learned', rating: 5 }] } },
      { id: 's5', type: 'contact_form', data: { title: 'Secure Your Spot', subtitle: 'Limited to 100 participants - register now' } }
    ]
  },
  restaurant: {
    name: 'Restaurant / F&B',
    sections: [
      { id: 's1', type: 'hero', data: { headline: '🍽️ Taste the Extraordinary', subheadline: 'Culinary excellence in every bite', ctaText: 'View Menu', ctaColor: '#ea580c', bgColor: '#7c2d12', textColor: '#ffffff', bgImage: '' } },
      { id: 's2', type: 'about', data: { title: 'Our Story', content: 'A passion for food, a dedication to quality. Every dish tells a story of tradition and innovation.', imageUrl: '' } },
      { id: 's3', type: 'benefits', data: { title: 'Why Choose Us', items: ['👨‍🍳 Award-winning chefs', '🌿 Fresh, locally-sourced ingredients', '🍷 Curated wine selection', '✨ Elegant ambiance'] } },
      { id: 's4', type: 'products', data: { title: 'Signature Dishes', subtitle: 'Chef\'s recommendations', columns: 3 } },
      { id: 's5', type: 'contact_form', data: { title: 'Make a Reservation', subtitle: 'Book your table for an unforgettable dining experience' } }
    ]
  }
};

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const pages = await db.query.landingPages.findMany({
        where: eq(landingPages.unitId, unit.id),
        orderBy: [landingPages.createdAt]
    });

    // Load products untuk preview di builder
    const productList = await db.query.products.findMany({
        where: and(eq(products.unitId, unit.id), isNull(products.deletedAt)),
        columns: { id: true, nama: true, hargaJual: true, foto: true, stok: true },
        limit: 20
    });

    return { unit, pages, productList, templates: TEMPLATES };
};

export const actions = {
    create: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const title = String(data.get('title') || '').trim();
        const templateKey = String(data.get('template') || 'leadgen');
        const pageSlugInput = String(data.get('page_slug') || title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')).trim();

        if (!title) return fail(400, { error: 'Judul halaman wajib diisi' });
        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            // Check if it's from the new template marketplace
            const { ADVANCED_TEMPLATES } = await import('./templates/+page.server.js');
            const template = ADVANCED_TEMPLATES[templateKey] || TEMPLATES[templateKey] || TEMPLATES.leadgen;
            
            const contentJson = template.content || {
                sections: template.sections,
                globalSettings: { primaryColor: '#4f46e5', fontFamily: 'Inter', favicon: '' }
            };

            await db.insert(landingPages).values({
                unitId: unit.id,
                title,
                pageSlug: pageSlugInput,
                contentJson,
                templateId: templateKey,
                isActive: false
            });
            return { success: true, message: 'Landing page berhasil dibuat! Sekarang kamu bisa edit kontennya.' };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') return fail(400, { error: 'Slug URL sudah digunakan, coba yang lain' });
            return fail(500, { error: 'Gagal membuat halaman: ' + err.message });
        }
    },

    toggle: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const id = Number(data.get('page_id'));
        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            const p = await db.query.landingPages.findFirst({ where: and(eq(landingPages.id, id), eq(landingPages.unitId, unit.id)) });
            if (!p) return fail(404, { error: 'Halaman tidak ditemukan' });
            await db.update(landingPages).set({ isActive: !p.isActive }).where(eq(landingPages.id, id));
            return { success: true };
        } catch { return fail(500, { error: 'Gagal toggle' }); }
    },

    delete: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const id = Number(data.get('page_id'));
        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            await db.delete(landingPages).where(and(eq(landingPages.id, id), eq(landingPages.unitId, unit.id)));
            return { success: true };
        } catch { return fail(500, { error: 'Gagal hapus' }); }
    }
};
