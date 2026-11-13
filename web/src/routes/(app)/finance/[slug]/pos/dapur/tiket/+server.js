/**
 * Tiket dapur/bar untuk layar dapur.
 * GET ?stasiun=bar → tiket aktif · POST { id, status } → ubah status (BARU → DIMASAK → SIAP → DISAJIKAN)
 */
import { json, isHttpError } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { daftarTiket, ubahStatusTiket } from '$lib/server/posResto';
import { PosError } from '$lib/server/posCheckout';
import { pesanAman } from '$lib/server/pesanAman';
import { triggerEvent } from '$lib/server/pusher';

/** @param {unknown} err */
function galat(err) {
	if (err instanceof PosError) return json({ error: pesanAman(err) }, { status: err.status });
	if (isHttpError(err)) return json({ error: err.body?.message || 'Akses ditolak' }, { status: err.status });
	return json({ error: 'Gagal memuat tiket dapur' }, { status: 500 });
}

export async function GET({ cookies, params, locals, url }) {
	try {
		const { unit } = await resolvePosUnitAccess(cookies, params, locals);
		const st = url.searchParams.get('stasiun');
		return json({ tiket: await daftarTiket(db, Number(unit.id), st ? st.slice(0, 20) : null) });
	} catch (err) {
		return galat(err);
	}
}

export async function POST({ request, cookies, params, locals }) {
	try {
		const { unit } = await resolvePosUnitAccess(cookies, params, locals);
		/** @type {any} */
		const b = await request.json().catch(() => ({}));
		await ubahStatusTiket(db, Number(unit.id), Number(b.id), String(b.status || ''));
		await triggerEvent(`unit-${unit.id}`, 'pos-dapur', { id: Number(b.id), status: b.status }).catch(() => {});
		return json({ ok: true });
	} catch (err) {
		return galat(err);
	}
}
