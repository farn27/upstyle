// Export CSV sekarang ditangani oleh +server.js di folder yang sama.
// File ini hanya placeholder agar tidak ada error routing.

export async function load({ params }) {
    return { slug: params.slug };
}