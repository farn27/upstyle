/**
 * Excel Export — ExcelJS
 * Generate Excel reports dengan styling proper.
 * Melengkapi xlsx yang sudah ada (xlsx untuk simple, ExcelJS untuk styled reports).
 */
import ExcelJS from 'exceljs';

const IDR = (n) => Number(n || 0).toLocaleString('id-ID');

/**
 * Style helper
 */
function headerStyle(ws, row, cols) {
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getCell(row, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF3B82F6' } } };
  }
}

/**
 * Export transaksi keuangan ke Excel
 */
export async function exportTransaksiExcel({ unitName, transactions = [], periode = '' }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bizgrow ERP';
  wb.created = new Date();

  const ws = wb.addWorksheet('Transaksi Keuangan');

  // Title row
  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = `Laporan Transaksi Keuangan — ${unitName}`;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = periode || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  ws.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' } };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  // Header
  ws.addRow([]);
  const headerRow = ws.addRow(['No', 'Tanggal', 'Keterangan', 'Kategori', 'Nominal (Rp)', 'Metode']);
  headerStyle(ws, 4, 6);

  ws.columns = [
    { key: 'no', width: 5 },
    { key: 'tanggal', width: 14 },
    { key: 'keterangan', width: 40 },
    { key: 'kategori', width: 12 },
    { key: 'nominal', width: 18 },
    { key: 'metode', width: 12 },
  ];

  // Data
  let totalMasuk = 0, totalKeluar = 0;
  transactions.forEach((tx, i) => {
    const isMasuk = tx.kategoriTrx === 'MASUK';
    const nominal = Number(tx.nominal || 0);
    if (isMasuk) totalMasuk += nominal; else totalKeluar += nominal;

    const row = ws.addRow([
      i + 1,
      new Date(tx.tanggal).toLocaleDateString('id-ID'),
      tx.keterangan || '',
      tx.kategoriTrx,
      nominal,
      tx.metodeBayar || 'KAS',
    ]);

    // Color berdasarkan kategori
    row.getCell(4).font = { color: { argb: isMasuk ? 'FF16A34A' : 'FFDC2626' }, bold: true };
    row.getCell(5).numFmt = '#,##0';
    row.getCell(5).font = { color: { argb: isMasuk ? 'FF16A34A' : 'FFDC2626' } };
    row.eachCell(c => { c.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } }; });
  });

  // Summary row
  ws.addRow([]);
  const sumRow = ws.addRow(['', '', '', 'TOTAL MASUK', totalMasuk, '']);
  sumRow.getCell(4).font = { bold: true };
  sumRow.getCell(5).numFmt = '#,##0';
  sumRow.getCell(5).font = { bold: true, color: { argb: 'FF16A34A' } };

  const sumRow2 = ws.addRow(['', '', '', 'TOTAL KELUAR', totalKeluar, '']);
  sumRow2.getCell(4).font = { bold: true };
  sumRow2.getCell(5).numFmt = '#,##0';
  sumRow2.getCell(5).font = { bold: true, color: { argb: 'FFDC2626' } };

  const laba = totalMasuk - totalKeluar;
  const labaRow = ws.addRow(['', '', '', 'LABA / RUGI', laba, '']);
  labaRow.getCell(4).font = { bold: true, size: 11 };
  labaRow.getCell(5).numFmt = '#,##0';
  labaRow.getCell(5).font = { bold: true, size: 11, color: { argb: laba >= 0 ? 'FF16A34A' : 'FFDC2626' } };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/**
 * Export data produk ke Excel
 */
export async function exportProdukExcel({ unitName, products = [] }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Katalog Produk');

  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = `Katalog Produk — ${unitName}`;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.addRow([]);
  ws.addRow(['No', 'SKU', 'Nama Produk', 'Kategori', 'Harga Beli', 'Harga Jual', 'Stok', 'Status']);
  headerStyle(ws, 3, 8);

  ws.columns = [
    { width: 5 }, { width: 14 }, { width: 35 }, { width: 16 },
    { width: 16 }, { width: 16 }, { width: 8 }, { width: 10 },
  ];

  products.forEach((p, i) => {
    const row = ws.addRow([
      i + 1, p.sku || '', p.nama, p.kategori || 'UMUM',
      Number(p.hargaBeli || 0), Number(p.hargaJual || 0), p.stok || 0,
      p.status || 'active',
    ]);
    row.getCell(5).numFmt = '#,##0';
    row.getCell(6).numFmt = '#,##0';

    // Low stock highlight
    if ((p.stok || 0) <= (p.minStok || 5)) {
      row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
      row.getCell(7).font = { color: { argb: 'FFDC2626' }, bold: true };
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/**
 * Export data karyawan ke Excel
 */
export async function exportKaryawanExcel({ unitName, employees = [] }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data Karyawan');

  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = `Data Karyawan — ${unitName}`;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.addRow([]);
  ws.addRow(['No', 'Nama Lengkap', 'Jabatan', 'Divisi', 'Gaji Pokok', 'Status', 'Tanggal Gabung']);
  headerStyle(ws, 3, 7);

  ws.columns = [
    { width: 5 }, { width: 30 }, { width: 20 }, { width: 18 },
    { width: 16 }, { width: 10 }, { width: 14 },
  ];

  employees.forEach((e, i) => {
    const row = ws.addRow([
      i + 1, e.fullName || '', e.position || '', e.division || '',
      Number(e.salary || 0), e.status || 'active',
      e.joinDate || '',
    ]);
    row.getCell(5).numFmt = '#,##0';
    if (e.status === 'inactive') {
      row.eachCell(c => { c.font = { color: { argb: 'FF94A3B8' } }; });
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
