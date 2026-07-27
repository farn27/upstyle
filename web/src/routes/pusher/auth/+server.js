import { json } from '@sveltejs/kit';
import { pusherServer } from '$lib/server/pusher'; 

// 👇 1. TAMBAHKAN CONFIG INI (PENTING!)
// Ini mematikan pengecekan CSRF bawaan SvelteKit khusus untuk endpoint ini.
export const config = {
    csrf: false
};

export const POST = async ({ request, locals }) => {
    const user = locals.user;

    // Debugging: Cek apakah log ini muncul di Terminal VS Code
    console.log("👮 Satpam Pusher Menerima Tamu:", {
        user: user?.username || "GHOST (Tidak ada session)",
        role: user?.role
    });
    
    // 2. Cek User Login (Keamanan Manual Kita)
    if (!user) {
        console.log("⛔ Ditolak: User dianggap belum login");
        return json({ message: 'Forbidden: Login dulu bos!' }, { status: 403 });
    }

    // 3. Ambil data socket & channel dari Browser
    const data = await request.formData();
    const socketId = data.get('socket_id');
    const channel = data.get('channel_name');

    // 4. Stempel Izinnya
    const authResponse = pusherServer.authorizeChannel(socketId, channel, {
        user_id: user.id,
        user_info: { name: user.username, role: user.role }
    });

    return json(authResponse);
};