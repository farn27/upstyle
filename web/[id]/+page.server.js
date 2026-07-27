// src/routes/finance/[id]/+page.server.js
import { pool } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
    // params.id sekarang berisi slug (misal: 'toko-baju')
    const { id } = params; 

    try {
        const [rows] = await pool.execute('SELECT * FROM unit_bisnis WHERE slug = ?', [id]);

        if (rows.length === 0) {
            throw error(404, 'Bisnis tidak ditemukan!');
        }

        return { unit: rows[0] };
    } catch (err) {
        throw error(500, 'Database Error');
    }
}