import { json } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { bacaBase64, bacaBarisFile, validasiImpor, ImporEksporError } from '$lib/server/imporEkspor';

/** POST /api/app/import/validate  body: { unitId, dataType, fileBase64, fileName } — cek file tanpa menyimpan apa pun */
export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	try {
		const body = await request.json();
		const rows = bacaBarisFile(bacaBase64(body?.fileBase64));
		const hasil = validasiImpor(/** @type {any} */ (String(body?.dataType || '').toLowerCase()), rows);
		return json({ success: true, message: hasil.isValid ? 'File siap diimpor' : 'File perlu diperbaiki', data: hasil });
	} catch (err) {
		if (err instanceof ImporEksporError) return json({ success: false, message: err.message }, { status: err.status });
		return json({ success: false, message: 'Gagal membaca file' }, { status: 500 });
	}
}
