import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, landingPages } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

import { ADVANCED_TEMPLATES } from '$lib/server/landingTemplates';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    // Get user's existing pages
    const existingPages = await db.query.landingPages.findMany({
        where: eq(landingPages.unitId, unit.id),
        columns: { id: true, title: true, pageSlug: true, templateId: true, createdAt: true },
        orderBy: [landingPages.createdAt]
    });

    return {
        unit,
        templates: ADVANCED_TEMPLATES,
        existingPages,
        categories: ['All', 'E-commerce', 'High-End', 'SaaS', 'Portfolio', 'Restaurant', 'Fitness', 'Property', 'Events'],
        styles: ['All', 'Clean', 'Elegant', 'Bold', 'Artistic', 'Energetic', 'Professional', 'Romantic'],
        difficulties: ['All', 'beginner', 'intermediate', 'advanced']
    };
};
