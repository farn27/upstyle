/** Klien API Ruang Kendali. */

/**
 * @param {string} bagian  mis. "orbit", "unit?id=3"
 * @returns {Promise<any>}
 */
export async function ambil(bagian) {
	const r = await fetch(`/api/konsol/${bagian}`, { headers: { accept: 'application/json' } });
	const j = await r.json().catch(() => ({}));
	if (!r.ok) throw new Error(j?.message || `Gagal memuat (${r.status})`);
	return j;
}

/**
 * Kirim tindakan kontrol.
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ ok?: boolean, pesan?: string, message?: string, [k: string]: any }>}
 */
export async function kontrol(body) {
	const r = await fetch('/api/konsol/kontrol', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-konsol': '1' },
		body: JSON.stringify(body)
	});
	const j = await r.json().catch(() => ({}));
	if (!r.ok) throw new Error(j?.message || `Gagal (${r.status})`);
	return j;
}
