import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, chartOfAccounts } from '$lib/server/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { redis } from '$lib/server/redis';

/**
 * POST /api/app/help/diagnostics  body: { unitId? }
 * Cek cepat kenapa app bermasalah: server, database, sesi login, unit, Redis, COA.
 * Balasan sesuai DiagnosticResult di app: { overallStatus, checks[{ name, status, message, detail }], timestamp }
 */
export async function POST({ request, cookies }) {
	/** @type {{ name: string, status: 'ok' | 'warning' | 'error', message: string, detail: string | null }[]} */
	const checks = [{ name: 'server', status: 'ok', message: 'Server Bizgrow bisa dihubungi', detail: null }];

	const userId = await getCurrentUserId(cookies, request);
	checks.push(userId
		? { name: 'sesi', status: 'ok', message: 'Sesi login aktif', detail: null }
		: { name: 'sesi', status: 'error', message: 'Sesi login habis — silakan login ulang', detail: null });

	let body = {};
	try { body = await request.json(); } catch { /* body boleh kosong */ }
	const unitId = Number(/** @type {any} */ (body)?.unitId);

	const mulai = Date.now();
	try {
		await db.select({ n: sql`1` }).from(unitBisnis).limit(1);
		checks.push({ name: 'database', status: 'ok', message: 'Database terhubung', detail: `${Date.now() - mulai} ms` });
	} catch {
		checks.push({ name: 'database', status: 'error', message: 'Database tidak bisa dihubungi', detail: null });
	}

	if (!redis) {
		checks.push({ name: 'cache', status: 'warning', message: 'Cache (Redis) tidak aktif — app tetap jalan, tapi lebih lambat', detail: null });
	} else {
		try {
			await redis.ping();
			checks.push({ name: 'cache', status: 'ok', message: 'Cache (Redis) aktif', detail: null });
		} catch {
			checks.push({ name: 'cache', status: 'warning', message: 'Cache (Redis) tidak merespons', detail: null });
		}
	}

	if (userId && unitId) {
		try {
			const unit = await db.query.unitBisnis.findFirst({
				where: and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, userId)),
				columns: { id: true, namaUnit: true }
			});
			if (!unit) {
				checks.push({ name: 'unit', status: 'error', message: 'Unit tidak ditemukan di akun ini — pilih ulang unit', detail: null });
			} else {
				checks.push({ name: 'unit', status: 'ok', message: `Unit "${unit.namaUnit}" bisa diakses`, detail: null });
				const [{ jumlah }] = await db.select({ jumlah: sql`COUNT(*)` }).from(chartOfAccounts).where(eq(chartOfAccounts.unitId, unitId));
				checks.push(Number(jumlah) > 0
					? { name: 'akun_coa', status: 'ok', message: `${jumlah} akun COA tersedia`, detail: null }
					: { name: 'akun_coa', status: 'warning', message: 'Unit belum punya COA — isi COA standar di Master Data supaya jurnal tercatat', detail: null });
			}
		} catch {
			checks.push({ name: 'unit', status: 'error', message: 'Gagal mengecek unit', detail: null });
		}
	}

	const overallStatus = checks.some((c) => c.status === 'error') ? 'error' : checks.some((c) => c.status === 'warning') ? 'warning' : 'ok';
	return json({ success: true, data: { overallStatus, checks, timestamp: new Date().toISOString() } });
}
