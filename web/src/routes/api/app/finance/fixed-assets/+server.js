import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { fixedAssets } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { triggerEvent } from '$lib/server/pusher';

export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	const unitId = url.searchParams.get('unitId');
	if (!unitId) {
		return json({ success: false, message: 'unitId parameter is required' }, { status: 400 });
	}

	try {
		const data = await db.query.fixedAssets.findMany({
			where: eq(fixedAssets.unitId, Number(unitId)),
			orderBy: [desc(fixedAssets.createdAt)]
		});

		return json({
			success: true,
			message: 'Berhasil mengambil data aset tetap',
			data
		});
	} catch (err) {
		log.finance.error({ err }, 'API GET FIXED ASSETS ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const {
			unitId,
			namaAset,
			kategori,
			nilaiPerolehan,
			tanggalPerolehan,
			umurEkonomis,
			metodePenyusutan,
			nilaiSisa,
			keterangan,
			coaId
		} = body;

		if (!unitId || !namaAset || nilaiPerolehan == null || !tanggalPerolehan || umurEkonomis == null) {
			return json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
		}

		const perolehan = Number(nilaiPerolehan);
		const sisa = Number(nilaiSisa || 0);
		const nilaiBuku = perolehan - sisa;

		const [inserted] = await db.insert(fixedAssets).values({
			unitId: Number(unitId),
			namaAset,
			kategori: kategori || 'LAINNYA',
			nilaiPerolehan: String(perolehan),
			tanggalPerolehan,
			umurEkonomis: Number(umurEkonomis),
			metodePenyusutan: metodePenyusutan || 'GARIS_LURUS',
			nilaiSisa: String(sisa),
			akumulasiPenyusutan: '0',
			nilaiBuku: String(nilaiBuku),
			status: 'AKTIF',
			coaId: coaId ? Number(coaId) : null,
			keterangan: keterangan || null
		});

		try {
			await triggerEvent(`unit-${unitId}`, 'fixed-asset-created', {
				id: inserted.insertId,
				namaAset
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Aset tetap berhasil ditambahkan',
			data: { id: inserted.insertId }
		});
	} catch (err) {
		log.finance.error({ err }, 'API POST FIXED ASSET ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}

export async function PUT({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { id, namaAset, status, keterangan, akumulasiPenyusutan } = body;

		if (!id) {
			return json({ success: false, message: 'id aset tetap wajib diisi' }, { status: 400 });
		}

		const asset = await db.query.fixedAssets.findFirst({
			where: eq(fixedAssets.id, Number(id))
		});

		if (!asset) {
			return json({ success: false, message: 'Aset tetap tidak ditemukan' }, { status: 404 });
		}

		const newAkumulasi = akumulasiPenyusutan != null ? Number(akumulasiPenyusutan) : Number(asset.akumulasiPenyusutan || 0);
		const perolehan = Number(asset.nilaiPerolehan);
		const newNilaiBuku = perolehan - newAkumulasi;

		await db.update(fixedAssets)
			.set({
				namaAset: namaAset !== undefined ? namaAset : asset.namaAset,
				status: status !== undefined ? status : asset.status,
				keterangan: keterangan !== undefined ? keterangan : asset.keterangan,
				akumulasiPenyusutan: String(newAkumulasi),
				nilaiBuku: String(newNilaiBuku)
			})
			.where(eq(fixedAssets.id, Number(id)));

		try {
			await triggerEvent(`unit-${asset.unitId}`, 'fixed-asset-updated', {
				id: asset.id,
				nilaiBuku: newNilaiBuku
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Aset tetap berhasil diperbarui',
			data: {
				id: asset.id,
				nilaiBuku: newNilaiBuku
			}
		});
	} catch (err) {
		log.finance.error({ err }, 'API PUT FIXED ASSET ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}

export async function DELETE({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	const assetId = url.searchParams.get('assetId');
	if (!assetId) {
		return json({ success: false, message: 'assetId parameter is required' }, { status: 400 });
	}

	try {
		const asset = await db.query.fixedAssets.findFirst({
			where: eq(fixedAssets.id, Number(assetId))
		});

		if (!asset) {
			return json({ success: false, message: 'Aset tetap tidak ditemukan' }, { status: 404 });
		}

		await db.update(fixedAssets)
			.set({ status: 'DINONAKTIFKAN' })
			.where(eq(fixedAssets.id, Number(assetId)));

		try {
			await triggerEvent(`unit-${asset.unitId}`, 'fixed-asset-deleted', {
				id: asset.id
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Aset tetap berhasil dinonaktifkan',
			data: { id: asset.id }
		});
	} catch (err) {
		log.finance.error({ err }, 'API DELETE FIXED ASSET ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}
