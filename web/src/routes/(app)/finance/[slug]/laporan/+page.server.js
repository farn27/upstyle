import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { thisMonthWIB } from '$lib/server/dateUtils';
import { buatLaporanKeuangan } from '$lib/server/laporanKeuangan';

export const load = async ({ params, url, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;
    const tahun = parseInt(url.searchParams.get('tahun') || thisMonthWIB().year);
    const bulan = url.searchParams.get('bulan') || 'all';

    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const { dashboard, labaRugi, neraca } = await buatLaporanKeuangan(unit, tahun, bulan);

    return {
        unit, tahun, bulan,
        dashboard, labaRugi, neraca
    };
};
