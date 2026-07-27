import { db } from '$lib/server/drizzle';
import { users, employees, riwayatAksi } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';
import { getUserIdFromSession } from '$lib/server/session';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { env } from '$env/dynamic/private';

export async function load({ cookies, depends, url, locals }) {
    const sessionToken = cookies.get('session_id');
    const isAuthPage = url.pathname.startsWith('/auth') || url.pathname === '/login';
    const isPosPortalRoute = /^\/finance\/[^\/]+\/pos(?:\/.*)?$/.test(url.pathname);
    let staffPortalAllowed = false;

    if (isPosPortalRoute && !sessionToken) {
        const unitSlug = url.pathname.split('/')[2] || null;
        if (unitSlug) {
            const staffSession = await getVerifiedStaffSession(cookies, { unitSlug });
            staffPortalAllowed = Boolean(staffSession);
        }
    }

    // 🔐 Resolve user ID dari locals (sudah di-load di hooks.server.js)
    const userId = locals.user?.id || null;

    if (url.pathname === '/beranda' || url.pathname === '/beranda/') throw redirect(303, '/');

    if (!userId && !isAuthPage && !staffPortalAllowed) throw redirect(303, '/auth/login'); 
    if (userId && isAuthPage) throw redirect(303, '/');
    if (!userId) return { user: null, riwayatGlobal: [] };

    // --- STRATEGI CACHE: Hyper-Fast Layout ---
    const cacheKey = `layout_session_v2:${userId}`;

    try {
        depends('app:notifications');

        // 1. Cek Memori Kilat (Redis) dulu
        let cachedLayout = null;
        if (redis) {
            try {
                cachedLayout = await redis.get(cacheKey);
            } catch (redisErr) {
                console.error('[Redis] Gagal get cache layout:', redisErr.message);
            }
        }

        if (cachedLayout) {
            return typeof cachedLayout === 'string'
                ? JSON.parse(cachedLayout)
                : cachedLayout;
        }
        let userData = null;
        let ownerIdForLogs = null;

        // --- PINTU 1: CEK OWNER ---
        const ownerRows = await db.select({ id: users.id, username: users.username })
            .from(users)
            .where(eq(users.id, userId));

        if (ownerRows.length > 0) {
            userData = {
                id: ownerRows[0].id,
                username: ownerRows[0].username,
                role: 'user',
                isOwner: true
            };
            ownerIdForLogs = ownerRows[0].id;
        } else {
            // --- PINTU 2: CEK STAFF ---
            const staffRows = await db.select({
                id: employees.id,
                full_name: employees.fullName,
                user_id: employees.userId,
                company_id: employees.companyId,
                job_grade: employees.jobGrade
            })
            .from(employees)
            .where(eq(employees.id, userId));

            if (staffRows.length > 0) {
                const staff = staffRows[0];
                userData = {
                    id: staff.id,
                    username: staff.full_name,
                    role: staff.job_grade,
                    companyId: staff.company_id,
                    isOwner: false
                };
                ownerIdForLogs = staff.user_id; 
            }
        }

        if (!userData) {
            cookies.delete('session_id', { path: '/' });
            throw redirect(303, '/auth/login');
        }

        // 2. Ambil Riwayat Aksi
        const logs = await db.select({
            id: riwayatAksi.id,
            pesan: riwayatAksi.pesan,
            tipe: riwayatAksi.tipe,
            waktu: riwayatAksi.waktu,
            kategori: riwayatAksi.kategori,
            link: riwayatAksi.link 
        })
        .from(riwayatAksi)
        .where(eq(riwayatAksi.userId, ownerIdForLogs))
        .orderBy(desc(riwayatAksi.waktu))
        .limit(10);

        const finalData = {
            user: userData,
            ownerId: ownerIdForLogs,
            riwayatGlobal: JSON.parse(JSON.stringify(logs))
        };

        // 3. Simpan ke Cache (TTL: 10 Menit)
        if (redis) {
            try {
                await redis.set(cacheKey, finalData, { ex: 600 });
            } catch (redisErr) {
                console.error('[Redis] Gagal set cache layout:', redisErr.message);
            }
        }

        return finalData;

    } catch (err) {
        if (err.status === 303) throw err;
        console.error('[Layout Server Error]', err);
        throw error(500, "Gagal memuat layout");
    }
}
