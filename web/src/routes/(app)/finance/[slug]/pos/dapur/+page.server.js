import { db } from '$lib/server/drizzle';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { ambilProfilPos } from '$lib/server/posProfil';
import { daftarTiket } from '$lib/server/posResto';

export async function load({ params, cookies, locals }) {
	const { unit } = await resolvePosUnitAccess(cookies, params, locals);
	const profil = await ambilProfilPos(db, Number(unit.id));
	return {
		namaUnit: unit.nama_unit || '',
		aktif: Boolean(profil?.pengaturan.dapur.aktif),
		stasiun: profil?.pengaturan.dapur.stasiun || [],
		tiket: profil?.pengaturan.dapur.aktif ? await daftarTiket(db, Number(unit.id)) : []
	};
}
