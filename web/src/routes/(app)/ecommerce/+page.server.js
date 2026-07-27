import { db } from '$lib/server/drizzle';
import { unitBisnis, users } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ cookies }) {
    const userId = await getCurrentUserId(cookies);

    if (!userId) {
        return { units: [], user: null };
    }

    try {
        const [userRows, units] = await Promise.all([
            db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { username: true }
            }),

            db.query.unitBisnis.findMany({
                where: eq(unitBisnis.userId, userId),
                orderBy: [desc(unitBisnis.id)]
            })
        ]);

        return {
            user: userRows || { username: 'Akun User' },
            units: units
        };

    } catch (err) {
        console.error("LOAD ERROR:", err);
        return { units: [], user: { username: 'Error Database' } };
    }
}
