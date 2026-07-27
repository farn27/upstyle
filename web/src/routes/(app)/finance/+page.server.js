import { db } from '$lib/server/drizzle';
import { unitBisnis, users } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ locals }) {
    const userId = locals.user?.id;

    if (!userId) {
        return { units: [], user: null };
    }

    try {
        // 2. Ambil data secara paralel agar loading halaman lebih cepat
        const [userRows, units] = await Promise.all([
            // Ambil Profil User
            db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { username: true } // Hanya ambil username saja
            }),

            // Ambil Semua Unit Bisnis (Pusat & Cabang) milik user ini
            db.query.unitBisnis.findMany({
                where: eq(unitBisnis.userId, userId),
                orderBy: [desc(unitBisnis.id)]
            })
        ]);

        // 3. Return data dengan format CamelCase (Standar Drizzle)
        return {
            user: userRows || { username: 'Akun User' },
            units: units // Ini akan berisi array objects [ { id, namaUnit, slug, ... } ]
        };

    } catch (err) {
        console.error("DRIZZLE LOAD ERROR:", err);
        return { 
            units: [], 
            user: { username: 'Error Database' },
            dbError: true 
        };
    }
}