import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { departments } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

	const unitId = url.searchParams.get('unitId');
	if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

	try {
		const departmentList = await db.query.departments.findMany({
			where: eq(departments.unitId, Number(unitId)),
			orderBy: [desc(departments.id)]
		});

		return json({
			success: true,
			message: "Berhasil mengambil daftar departemen",
			data: departmentList
		});
	} catch (err) {
		log.hr.error({ err }, 'API GET HR departments error');
		return json({ success: false, message: "Gagal mengambil data departemen" }, { status: 500 });
	}
}

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

	try {
		const body = await request.json();
		const { unitId, name } = body;

		if (!unitId || !name) {
			return json({ success: false, message: "unitId dan name wajib diisi" }, { status: 400 });
		}

		const [result] = await db.insert(departments).values({
			unitId: Number(unitId),
			name: String(name).trim()
		});

		return json({
			success: true,
			message: "Departemen berhasil ditambahkan",
			data: { id: result.insertId }
		});
	} catch (err) {
		log.hr.error({ err }, 'API POST HR departments error');
		return json({ success: false, message: "Gagal membuat departemen: " + err.message }, { status: 500 });
	}
}

export async function DELETE({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

	const departmentId = url.searchParams.get('departmentId');
	if (!departmentId) return json({ success: false, message: "departmentId wajib diisi" }, { status: 400 });

	try {
		await db.delete(departments).where(eq(departments.id, Number(departmentId)));

		return json({
			success: true,
			message: "Departemen berhasil dihapus"
		});
	} catch (err) {
		log.hr.error({ err }, 'API DELETE HR departments error');
		return json({ success: false, message: "Gagal menghapus departemen" }, { status: 500 });
	}
}
