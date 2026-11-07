import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { laporanPembelian } from '$lib/server/laporanPembelian';
import { todayStrWIB } from '$lib/server/dateUtils';
import { log } from '$lib/server/logger';

const formatTanggal = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/app/scm/laporan?unitId=X[&dari=YYYY-MM-DD&sampai=YYYY-MM-DD] — laporan pembelian (default bulan berjalan)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = Number(url.searchParams.get('unitId'));
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
    try {
        if (!(await unitMilikUser(db, userId, unitId))) return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });
        const hariIni = todayStrWIB();
        const dariIn = url.searchParams.get('dari') || '';
        const sampaiIn = url.searchParams.get('sampai') || '';
        const dari = formatTanggal.test(dariIn) ? dariIn : `${hariIni.slice(0, 7)}-01`;
        const sampai = formatTanggal.test(sampaiIn) ? sampaiIn : hariIni;
        const { ringkasan: r, perSupplier, perProduk } = await laporanPembelian(db, unitId, dari, sampai);
        return json({
            success: true,
            data: {
                dari, sampai,
                jumlahFaktur: Number(r?.jumlah || 0), subtotal: Number(r?.subtotal || 0), diskon: Number(r?.diskon || 0),
                ongkir: Number(r?.ongkir || 0), ppn: Number(r?.ppn || 0), total: Number(r?.total || 0),
                perSupplier: perSupplier.map((s) => ({ nama: s.nama || '-', jumlah: Number(s.jumlah), total: Number(s.total) })),
                perProduk: perProduk.map((p) => ({ nama: p.nama || '-', qty: Number(p.qty), nilai: Number(p.nilai) }))
            }
        });
    } catch (err) {
        log.api.error({ err }, 'GET scm/laporan');
        return json({ success: false, message: 'Gagal memuat laporan pembelian' }, { status: 500 });
    }
}
