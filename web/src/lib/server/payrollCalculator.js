/**
 * Payroll Calculator — Slip Gaji & PPh 21 Indonesia
 * Berdasarkan aturan pajak 2024 (tarif progresif)
 */

/**
 * Tarif PPh 21 Progresif 2024 (per tahun)
 * @param {number} pkp - Penghasilan Kena Pajak per tahun
 * @returns {number} PPh 21 per tahun
 */
export function hitungPPh21Tahunan(pkp) {
	if (pkp <= 0) return 0;
	let pajak = 0;

	const lapisan = [
		{ batas: 60_000_000, tarif: 0.05 },
		{ batas: 250_000_000, tarif: 0.15 },
		{ batas: 500_000_000, tarif: 0.25 },
		{ batas: 5_000_000_000, tarif: 0.30 },
		{ batas: Infinity, tarif: 0.35 }
	];

	let sisa = pkp;
	let prev = 0;
	for (const l of lapisan) {
		const batas = l.batas - prev;
		if (sisa <= 0) break;
		const kena = Math.min(sisa, batas);
		pajak += kena * l.tarif;
		sisa -= kena;
		prev = l.batas;
	}

	return Math.round(pajak);
}

// PTKP 2024
export const PTKP = {
	TK0: 54_000_000,   // Tidak kawin, tanpa tanggungan
	TK1: 58_500_000,   // Tidak kawin, 1 tanggungan
	TK2: 63_000_000,   // Tidak kawin, 2 tanggungan
	TK3: 67_500_000,   // Tidak kawin, 3 tanggungan
	K0:  58_500_000,   // Kawin, tanpa tanggungan
	K1:  63_000_000,   // Kawin, 1 tanggungan
	K2:  67_500_000,   // Kawin, 2 tanggungan
	K3:  72_000_000    // Kawin, 3 tanggungan
};

// Biaya Jabatan: 5% dari bruto, max 500rb/bulan atau 6jt/tahun
const MAX_BIAYA_JABATAN_BULAN = 500_000;

/**
 * Hitung PPh 21 bulanan (gross method)
 * @param {object} opts
 * @param {number} opts.gajiPokok
 * @param {number} [opts.tunjangan] - total tunjangan tetap
 * @param {number} [opts.ptkp] - PTKP tahunan (default TK0)
 * @returns {{ pph21Bulanan: number, pph21Tahunan: number, pkp: number, biayaJabatan: number }}
 */
export function hitungPPh21Bulanan({ gajiPokok, tunjangan = 0, ptkp = PTKP.TK0 }) {
	const brutoBulanan = gajiPokok + tunjangan;
	const brutoTahunan = brutoBulanan * 12;

	// Biaya jabatan
	const biayaJabatanBulanan = Math.min(brutoBulanan * 0.05, MAX_BIAYA_JABATAN_BULAN);
	const biayaJabatanTahunan = biayaJabatanBulanan * 12;

	// Penghasilan Neto Tahunan
	const netoTahunan = brutoTahunan - biayaJabatanTahunan;

	// PKP
	const pkp = Math.max(0, netoTahunan - ptkp);

	const pph21Tahunan = hitungPPh21Tahunan(pkp);
	const pph21Bulanan = Math.round(pph21Tahunan / 12);

	return { pph21Bulanan, pph21Tahunan, pkp, biayaJabatan: biayaJabatanBulanan };
}

/**
 * Generate slip gaji HTML
 * @param {object} opts
 * @param {object} opts.employee - data karyawan
 * @param {object} opts.unit - data unit bisnis
 * @param {number} opts.periodMonth
 * @param {number} opts.periodYear
 * @param {number} opts.basicSalary
 * @param {Array<{name: string, amount: number, type: 'addition'|'deduction'}>} [opts.components]
 * @param {number} [opts.ptkpCode] - kode PTKP default TK0
 */
export function generateSlipGajiHTML(opts) {
	const {
		employee,
		unit,
		periodMonth,
		periodYear,
		basicSalary,
		components = [],
		ptkpCode = 'TK0'
	} = opts;

	const bulanNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

	const additions = components.filter((c) => c.type === 'addition');
	const deductions = components.filter((c) => c.type === 'deduction');

	const totalTunjangan = additions.reduce((s, c) => s + Number(c.amount), 0);
	const totalPotongan = deductions.reduce((s, c) => s + Number(c.amount), 0);

	const ptkpNominal = PTKP[ptkpCode] || PTKP.TK0;
	const { pph21Bulanan, biayaJabatan } = hitungPPh21Bulanan({
		gajiPokok: basicSalary,
		tunjangan: totalTunjangan,
		ptkp: ptkpNominal
	});

	const totalPotonganFinal = totalPotongan + pph21Bulanan;
	const gajiDiterima = basicSalary + totalTunjangan - totalPotonganFinal;

	const idr = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
	const now = new Date();

	const additionRows = additions.map((c) => `
		<tr style="border-bottom:1px solid #f8fafc">
			<td style="padding:8px 0;color:#374151;font-size:13px">${c.name}</td>
			<td style="padding:8px 0;color:#10b981;font-size:13px;text-align:right;font-family:monospace;font-weight:600">+ ${idr(c.amount)}</td>
		</tr>`).join('');

	const deductionRows = deductions.map((c) => `
		<tr style="border-bottom:1px solid #f8fafc">
			<td style="padding:8px 0;color:#374151;font-size:13px">${c.name}</td>
			<td style="padding:8px 0;color:#ef4444;font-size:13px;text-align:right;font-family:monospace;font-weight:600">- ${idr(c.amount)}</td>
		</tr>`).join('');

	return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Slip Gaji — ${employee.full_name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; background: white; }
    .no-print { display: none !important; }
    @page { margin: 12mm; }
  }
  .page { max-width: 680px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:32px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <h1 style="color:white;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px">${unit.namaUnit || 'Upstyle'}</h1>
      <p style="color:#a5b4fc;font-size:11px;margin-top:4px">${unit.alamat || ''}</p>
    </div>
    <div style="text-align:right">
      <p style="color:#c7d2fe;font-size:10px;text-transform:uppercase;letter-spacing:2px">Slip Gaji</p>
      <p style="color:white;font-size:16px;font-weight:900;font-family:monospace">${bulanNames[periodMonth]} ${periodYear}</p>
    </div>
  </div>

  <!-- Employee Info -->
  <div style="padding:24px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;gap:32px">
    <div>
      <p style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Nama Karyawan</p>
      <p style="font-size:15px;font-weight:800;color:#1e293b">${employee.full_name || '-'}</p>
    </div>
    <div>
      <p style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Jabatan</p>
      <p style="font-size:14px;font-weight:600;color:#374151">${employee.position || '-'}</p>
    </div>
    <div>
      <p style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Status PTKP</p>
      <p style="font-size:14px;font-weight:600;color:#374151">${ptkpCode}</p>
    </div>
    <div>
      <p style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Tanggal Cetak</p>
      <p style="font-size:13px;font-weight:600;color:#374151">${now.toLocaleDateString('id-ID')}</p>
    </div>
  </div>

  <!-- Salary Table -->
  <div style="padding:32px;display:flex;gap:32px">
    <!-- Left: Earnings -->
    <div style="flex:1">
      <p style="font-size:10px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px">Pendapatan</p>
      <table style="width:100%;border-collapse:collapse">
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:8px 0;color:#374151;font-size:13px">Gaji Pokok</td>
          <td style="padding:8px 0;color:#1e293b;font-size:13px;text-align:right;font-family:monospace;font-weight:700">${idr(basicSalary)}</td>
        </tr>
        ${additionRows}
        <tr style="border-top:2px solid #e2e8f0">
          <td style="padding:12px 0;font-weight:900;color:#1e293b;font-size:13px;text-transform:uppercase">Total Bruto</td>
          <td style="padding:12px 0;font-weight:900;color:#10b981;font-size:14px;text-align:right;font-family:monospace">${idr(basicSalary + totalTunjangan)}</td>
        </tr>
      </table>
    </div>

    <!-- Right: Deductions -->
    <div style="flex:1">
      <p style="font-size:10px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px">Potongan</p>
      <table style="width:100%;border-collapse:collapse">
        ${deductionRows}
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:8px 0;color:#374151;font-size:13px">PPh 21</td>
          <td style="padding:8px 0;color:#ef4444;font-size:13px;text-align:right;font-family:monospace;font-weight:600">- ${idr(pph21Bulanan)}</td>
        </tr>
        <tr style="border-top:2px solid #e2e8f0">
          <td style="padding:12px 0;font-weight:900;color:#1e293b;font-size:13px;text-transform:uppercase">Total Potongan</td>
          <td style="padding:12px 0;font-weight:900;color:#ef4444;font-size:14px;text-align:right;font-family:monospace">${idr(totalPotonganFinal)}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Net Salary -->
  <div style="margin:0 32px 32px;background:linear-gradient(135deg,#4f46e5,#6366f1);border-radius:12px;padding:24px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <p style="color:#c7d2fe;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px">Gaji Diterima (Take Home Pay)</p>
      <p style="color:white;font-size:28px;font-weight:900;font-family:monospace;margin-top:4px">${idr(gajiDiterima)}</p>
    </div>
    <div style="text-align:right">
      <p style="color:#c7d2fe;font-size:11px;font-weight:600">Biaya Jabatan: ${idr(biayaJabatan)}/bln</p>
      <p style="color:#c7d2fe;font-size:11px;font-weight:600">PPh 21: ${idr(pph21Bulanan)}/bln</p>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
    <p style="font-size:11px;color:#94a3b8">Dokumen ini sah tanpa tanda tangan basah</p>
    <p style="font-size:11px;font-weight:900;color:#4f46e5">Upstyle Payroll System</p>
  </div>
</div>

<!-- Print button -->
<div class="no-print" style="text-align:center;margin:24px">
  <button onclick="window.print()" style="padding:12px 32px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer">🖨️ Cetak Slip Gaji</button>
</div>
</body>
</html>`;
}
