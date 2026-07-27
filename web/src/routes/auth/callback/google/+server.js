import { redirect } from '@sveltejs/kit';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { secureCookieOptions } from '$lib/server/cookieOptions';
import { createSession } from '$lib/server/session';

export async function GET({ url, cookies }) {
    const code = url.searchParams.get('code');

    if (!code) throw redirect(303, '/auth/login?error=auth_failed');

    const origin = (env.ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
    const redirectUri = `${origin}/auth/callback/google`;

    // 1. Tukar 'code' dengan Access Token
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });
    const tokens = await res.json();

    if (tokens.error) {
        console.error('Google OAuth Token Error:', tokens);
        throw redirect(303, '/auth/login?error=oauth_token_failed');
    }

    // 2. Ambil Profil User dari Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const profile = await userRes.json();

    if (profile.error || !profile.email) {
        console.error('Google OAuth Profile Error:', profile);
        throw redirect(303, '/auth/login?error=oauth_profile_failed');
    }

    // 3. Cek atau Daftarkan User di Database
    // Sesuaikan kolom ini dengan tabel 'users' kamu (email, username, google_id)
    const existingUsers = await db.select({ id: users.id }).from(users).where(eq(users.email, profile.email)).limit(1);
    
    let userId;
    if (existingUsers.length === 0) {
        const [result] = await db.insert(users).values({
            username: profile.name || profile.email.split('@')[0],
            email: profile.email,
            password: null,
            googleId: profile.id,
            avatarUrl: profile.picture || null,
            role: 'admin',
            companyId: null,
            emailVerifiedAt: null,
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });
        userId = result.insertId;
    } else {
        userId = existingUsers[0].id;
    }

    // 4. Set Cookie Sesi (Login Berhasil)
    const sessionToken = await createSession(userId);
    cookies.set('session_id', sessionToken, secureCookieOptions(60 * 60 * 24 * 7));

    throw redirect(303, '/finance');
}