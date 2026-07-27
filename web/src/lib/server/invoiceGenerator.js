/**
 * Invoice Generator
 * Generate invoice HTML untuk di-print atau di-convert ke PDF client-side
 * Data dari POS order atau transaksi manual
 */

/**
 * Format rupiah
 * @param {number} n
 */
function idr(n) {
	return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

/**
 * Format tanggal Indonesia
 * @param {string|Date} d
 */
function tgl(d) {
	return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Generate HTML invoice
 * @param {object} opts
 * @param {object} opts.unit - { namaUnit, alamat, telepon, email }
 * @param {object} opts.customer - { nama, telepon, email }
 * @param {string} opts.invoiceNumber
 * @param {string|Date} opts.tanggal
 * @param {string|Date} [opts.jatuhTempo]
 * @param {Array<{nama: string, qty: number, harga: number, total: number}>} opts.items
 * @param {number} opts.subtotal
 * @param {number} [opts.discount]
 * @param {number} [opts.pajak] - nominal pajak
 * @param {number} opts.total
 * @param {string} [opts.metodeBayar]
 * @param {string} [opts.catatan]
 * @param {'LUNAS'|'BELUM_BAYAR'|'SEBAGIAN'} [opts.status]
 * @returns {string} HTML string
 */
export function generateInvoiceHTML(opts) {
	const {
		unit,
		customer,
		invoiceNumber,
		tanggal,
		jatuhTempo,
		items = [],
		subtotal,
		discount = 0,
		pajak = 0,
		total,
		metodeBayar = 'TUNAI',
		catatan = '',
		status = 'LUNAS'
	} = opts;

	const statusColor = status === 'LUNAS' ? '#10b981' : status === 'SEBAGIAN' ? '#f59e0b' : '#ef4444';
	const statusText = status === 'LUNAS' ? 'LUNAS' : status === 'SEBAGIAN' ? 'SEBAGIAN' : 'BELUM LUNAS';

	const rowsHtml = items
		.map(
			(item, i) => `
		<tr style="border-bottom:1px solid #f1f5f9">
			<td style="padding:10px 8px;color:#374151;font-size:13px">${i + 1}</td>
			<td style="padding:10px 8px;color:#1e293b;font-size:13px;font-weight:600">${item.nama}</td>
			<td style="padding:10px 8px;color:#374151;font-size:13px;text-align:center">${item.qty}</td>
			<td style="padding:10px 8px;color:#374151;font-size:13px;text-align:right;font-family:monospace">${idr(item.harga)}</td>
			<td style="padding:10px 8px;color:#1e293b;font-size:13px;text-align:right;font-weight:700;font-family:monospace">${idr(item.total)}</td>
		</tr>`
		)
		.join('');

	return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Invoice ${invoiceNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1e293b; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none !important; }
    @page { margin: 16mm; }
  }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  table { width: 100%; border-collapse: collapse; }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">
    <div>
      <h1 style="font-size:28px;font-weight:900;color:#1e1b4b;letter-spacing:-1px;text-transform:uppercase">${unit.namaUnit || 'Upstyle'}</h1>
      <p style="color:#64748b;font-size:12px;margin-top:4px">${unit.alamat || ''}</p>
      ${unit.telepon ? `<p style="color:#64748b;font-size:12px">Tel: ${unit.telepon}</p>` : ''}
      ${unit.email ? `<p style="color:#64748b;font-size:12px">${unit.email}</p>` : ''}
    </div>
    <div style="text-align:right">
      <h2 style="font-size:32px;font-weight:900;color:#e2e8f0;text-transform:uppercase;letter-spacing:-1px">INVOICE</h2>
      <p style="font-size:16px;font-weight:800;color:#4f46e5;font-family:monospace">#${invoiceNumber}</p>
      <div style="margin-top:12px;display:inline-block;padding:6px 16px;background:${statusColor};border-radius:20px">
        <span style="color:#fff;font-size:11px;font-weight:900;letter-spacing:1px">${statusText}</span>
      </div>
    </div>
  </div>

  <!-- Date & Customer -->
  <div style="display:flex;justify-content:space-between;margin-bottom:32px;gap:32px">
    <div style="flex:1;background:#f8fafc;border-radius:8px;padding:20px">
      <p style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Tagihan Kepada</p>
      <p style="font-size:15px;font-weight:800;color:#1e293b">${customer?.nama || 'Pelanggan Umum'}</p>
      ${customer?.telepon ? `<p style="color:#64748b;font-size:12px;margin-top:2px">${customer.telepon}</p>` : ''}
      ${customer?.email ? `<p style="color:#64748b;font-size:12px">${customer.email}</p>` : ''}
    </div>
    <div style="flex:1;background:#f8fafc;border-radius:8px;padding:20px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <p style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Tanggal</p>
          <p style="font-size:13px;font-weight:700;color:#1e293b">${tgl(tanggal)}</p>
        </div>
        ${jatuhTempo ? `
        <div>
          <p style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Jatuh Tempo</p>
          <p style="font-size:13px;font-weight:700;color:#ef4444">${tgl(jatuhTempo)}</p>
        </div>` : ''}
        <div>
          <p style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Metode Bayar</p>
          <p style="font-size:13px;font-weight:700;color:#1e293b">${metodeBayar}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <table style="margin-bottom:24px">
    <thead>
      <tr style="background:#1e1b4b">
        <th style="padding:12px 8px;color:#e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:1px;text-align:left;width:40px">#</th>
        <th style="padding:12px 8px;color:#e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:1px;text-align:left">Deskripsi</th>
        <th style="padding:12px 8px;color:#e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:1px;text-align:center;width:60px">Qty</th>
        <th style="padding:12px 8px;color:#e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:1px;text-align:right;width:120px">Harga</th>
        <th style="padding:12px 8px;color:#e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:1px;text-align:right;width:120px">Total</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <!-- Totals -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
    <div style="width:280px">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9">
        <span style="color:#64748b;font-size:13px">Subtotal</span>
        <span style="color:#1e293b;font-size:13px;font-family:monospace;font-weight:600">${idr(subtotal)}</span>
      </div>
      ${discount > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9">
        <span style="color:#64748b;font-size:13px">Diskon</span>
        <span style="color:#ef4444;font-size:13px;font-family:monospace;font-weight:600">-${idr(discount)}</span>
      </div>` : ''}
      ${pajak > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9">
        <span style="color:#64748b;font-size:13px">Pajak</span>
        <span style="color:#1e293b;font-size:13px;font-family:monospace;font-weight:600">${idr(pajak)}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:12px 0;background:#4f46e5;margin-top:8px;border-radius:8px;padding:16px">
        <span style="color:#c7d2fe;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px">Total</span>
        <span style="color:#fff;font-size:20px;font-weight:900;font-family:monospace">${idr(total)}</span>
      </div>
    </div>
  </div>

  <!-- Notes -->
  ${catatan ? `
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:24px">
    <p style="font-size:9px;font-weight:900;color:#92400e;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Catatan</p>
    <p style="color:#78350f;font-size:13px">${catatan}</p>
  </div>` : ''}

  <!-- Footer -->
  <div style="border-top:2px solid #f1f5f9;padding-top:24px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <p style="font-size:11px;color:#94a3b8">Dokumen ini dibuat secara otomatis oleh sistem <b>Upstyle</b></p>
      <p style="font-size:11px;color:#94a3b8">Terima kasih atas kepercayaan Anda</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:11px;font-weight:900;color:#4f46e5;text-transform:uppercase">Upstyle</p>
      <p style="font-size:10px;color:#94a3b8">Business Management Platform</p>
    </div>
  </div>

  <!-- Print Button (hidden on print) -->
  <div class="no-print" style="margin-top:32px;text-align:center">
    <button onclick="window.print()" style="padding:12px 32px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;margin-right:12px">
      🖨️ Cetak Invoice
    </button>
    <button onclick="window.close()" style="padding:12px 24px;background:#f1f5f9;color:#374151;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer">
      Tutup
    </button>
  </div>
</div>
</body>
</html>`;
}

/**
 * Generate nomor invoice otomatis
 * @param {string} prefix - misal 'INV', 'POS'
 * @param {number} sequence
 */
export function generateInvoiceNumber(prefix = 'INV', sequence) {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const seq = String(sequence).padStart(4, '0');
	return `${prefix}-${year}${month}-${seq}`;
}
