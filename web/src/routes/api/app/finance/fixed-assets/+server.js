import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { fixedAssets, riwayatAksi, transaksi } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET /api/app/finance/fixed-assets?unitId=X
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const assets = await db.query.fixedAssets.findMany({
            where: eq(fixedAssets.unitId, Number(unitId)),
            orderBy: [desc(fixedAssets.id)]
        });

        const data = assets.map(a => {
            // Calculate current book value and depreciation
            const nilaiPerolehan = Number(a.nilaiPerolehan || 0);
            const nilaiSisa = Number(a.nilaiSisa || 0);
            const umurEkonomis = a.umurEkonomis || 1;
            const penyusutanTahunan = (nilaiPerolehan - nilaiSisa) / umurEkonomis;
            const akumulasi = Number(a.akumulasiPenyusutan || 0);
            const nilaiBuku = nilaiPerolehan - akumulasi;

            return {
                id: a.id, unitId: a.unitId, namaAset: a.namaAset, kategori: a.kategori,
                nilaiPerolehan, tanggalPerolehan: a.tanggalPerolehan || '',
                umurEkonomis, metodePenyusutan: a.metodePenyusutan,
                nilaiSisa, akumulasiPenyusutan: akumulasi,
                nilaiBuku, penyusutanTahunan, status: a.status, keterangan: a.keterangan || ''
            };
        });

        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET finance/fixed-assets');
        return json({ success: false, message: 'Gagal memuat aset tetap' }, { status: 500 });
    }
}

// POST /api/app/finance/fixed-assets — tambah aset tetap baru
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const schema = z.object({
        namaAset: z.string().min(1).max(150),
        kategori: z.enum(['TANAH','BANGUNAN','KENDARAAN','MESIN','INVENTARIS','LAINNYA']).default('LAINNYA'),
        nilaiPerolehan: z.coerce.number().positive(),
        tanggalPerolehan: z.string().min(1),
        umurEkonomis: z.coerce.number().int().positive(),
        metodePenyusutan: z.enum(['GARIS_LURUS','SALDO_MENURUN']).default('GARIS_LURUS'),
        nilaiSisa: z.coerce.number().optional().default(0),
        keterangan: z.string().optional(),
        unitId: z.coerce.number().int().positive()
    });

    try {
        const body = await request.json();
        const parsed = schema.safeParse(body.asset || body);
        if (!parsed.success) return json({ success: false, message: parsed.error.errors[0].message }, { status: 422 });

        const { namaAset, kategori, nilaiPerolehan, tanggalPerolehan, umurEkonomis, metodePenyusutan, nilaiSisa, keterangan, unitId } = parsed.data;
        const nilaiBuku = nilaiPerolehan - (nilaiSisa || 0);

        const [result] = await db.insert(fixedAssets).values({
            unitId: Number(unitId), namaAset, kategori, nilaiPerolehan: String(nilaiPerolehan),
            tanggalPerolehan, umurEkonomis, metodePenyusutan,
            nilaiSisa: String(nilaiSisa || 0), akumulasiPenyusutan: '0',
            nilaiBuku: String(nilaiBuku), status: 'AKTIF', keterangan: keterangan || null
        });

        // Record purchase as expense
        await db.insert(transaksi).values({
            userId, unitId: Number(unitId), kategoriTrx: 'KELUAR',
            nominal: String(nilaiPerolehan), totalHarga: String(nilaiPerolehan),
            keterangan: `Pembelian Aset Tetap: ${namaAset}`, metodeBayar: 'TRANSFER'
        });

        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId),
            pesan: `Aset tetap baru: ${namaAset} (Rp ${nilaiPerolehan.toLocaleString('id-ID')})`,
            kategori: 'FINANCE', tipe: 'success'
        });

        return json({ success: true, message: 'Aset tetap berhasil ditambahkan', data: { id: result.insertId } });
    } catch (err) {
        log.api.error({ err }, 'POST finance/fixed-assets');
        return json({ success: false, message: 'Gagal tambah aset tetap' }, { status: 500 });
    }
}
