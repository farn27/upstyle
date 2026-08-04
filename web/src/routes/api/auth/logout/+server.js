import { json } from '@sveltejs/kit';

export async function POST({ cookies }) {
    // Clear the authentication cookie. Adjust the cookie name if it's different.
    // Assuming 'session' is the cookie name based on standard SvelteKit auth patterns
    cookies.delete('session', { path: '/' });
    
    return json({
        success: true,
        message: "Berhasil logout"
    });
}
