import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { inngest } from '$lib/server/inngest';

export const GET = async ({ params }) => {
    const { slug } = params;

    try {
        const units = await db.select()
            .from(unitBisnis)
            .where(eq(unitBisnis.slug, slug));
        
        if (!units || units.length === 0) {
            return new Response(`ERROR: Unit dengan slug "${slug}" tidak ditemukan.`, { status: 404 });
        }

        const unit = units[0];

        // Memindahkan proses ke Inngest Worker
        await inngest.send({
            name: 'finance/report.generate',
            data: {
                unitId: unit.id,
                slug: slug,
                dateRange: 'all' // Bisa disesuaikan parameter rentang tanggal jika ada
            }
        });

        // Redirect kembali ke halaman laporan dengan parameter toast
        return new Response(null, {
            status: 302,
            headers: {
                Location: `/finance/${slug}/laporan?pesan=Laporan%20sedang%20di-generate.%20Notifikasi%20akan%20muncul%20segera.`
            }
        });

    } catch (err) {
        return new Response(`SYSTEM ERROR: ${err.message}`, { status: 500 });
    }
};
