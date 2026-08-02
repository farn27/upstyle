/**
 * PDF Generator — pdf-lib
 * Generate PDF yang lebih kaya fitur: invoice, laporan keuangan, slip gaji.
 * Melengkapi jsPDF yang sudah ada (jsPDF untuk simple, pdf-lib untuk complex).
 */
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const IDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

/**
 * Generate Invoice PDF
 * @param {{ unit, customer, items, invoiceNumber, total, metodeBayar, tanggal }} data
 * @returns {Promise<Uint8Array>}
 */
export async function generateInvoicePDF(data) {
  const { unit, customer, items = [], invoiceNumber, total, metodeBayar, tanggal } = data;

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const blue = rgb(0.07, 0.25, 0.75);
  const gray = rgb(0.5, 0.5, 0.5);
  const black = rgb(0, 0, 0);
  const white = rgb(1, 1, 1);

  // Header background
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: blue });

  // Logo / Title
  page.drawText('BIZGROW', { x: 40, y: height - 35, size: 22, font: fontBold, color: white });
  page.drawText('INVOICE', { x: width - 120, y: height - 35, size: 22, font: fontBold, color: white });
  page.drawText(invoiceNumber, { x: width - 120, y: height - 55, size: 10, font, color: rgb(0.8, 0.9, 1) });

  // Unit info
  let y = height - 110;
  page.drawText(unit.namaUnit || '', { x: 40, y, size: 13, font: fontBold, color: black });
  y -= 16;
  if (unit.alamat) { page.drawText(unit.alamat, { x: 40, y, size: 9, font, color: gray }); y -= 14; }
  if (unit.telepon) { page.drawText(`Tel: ${unit.telepon}`, { x: 40, y, size: 9, font, color: gray }); y -= 14; }

  // Customer
  y -= 10;
  page.drawText('Kepada:', { x: 40, y, size: 9, font: fontBold, color: gray });
  y -= 14;
  page.drawText(customer?.nama || 'Pelanggan', { x: 40, y, size: 11, font: fontBold, color: black });
  y -= 14;
  if (customer?.telepon) page.drawText(customer.telepon, { x: 40, y, size: 9, font, color: gray });

  // Date
  const dateStr = tanggal ? new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  page.drawText(dateStr, { x: width - 160, y: height - 110, size: 9, font, color: gray });

  // Divider
  y = height - 210;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });

  // Table header
  y -= 20;
  page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 20, color: rgb(0.95, 0.95, 0.98) });
  page.drawText('Nama Produk/Jasa', { x: 48, y, size: 9, font: fontBold, color: black });
  page.drawText('Qty', { x: 340, y, size: 9, font: fontBold, color: black });
  page.drawText('Harga', { x: 380, y, size: 9, font: fontBold, color: black });
  page.drawText('Total', { x: 470, y, size: 9, font: fontBold, color: black });

  // Items
  y -= 24;
  for (const item of items) {
    page.drawText(String(item.nama || '').substring(0, 40), { x: 48, y, size: 9, font, color: black });
    page.drawText(String(item.qty || 1), { x: 340, y, size: 9, font, color: black });
    page.drawText(IDR(item.harga), { x: 365, y, size: 9, font, color: black });
    page.drawText(IDR(item.total || (item.harga * item.qty)), { x: 455, y, size: 9, font, color: black });
    y -= 18;
    if (y < 100) break;
  }

  // Total
  y -= 10;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 20;
  page.drawText('TOTAL', { x: 380, y, size: 11, font: fontBold, color: black });
  page.drawText(IDR(total), { x: 440, y, size: 11, font: fontBold, color: blue });

  y -= 16;
  page.drawText(`Metode: ${metodeBayar || 'KAS'}`, { x: 380, y, size: 8, font, color: gray });

  // Footer
  page.drawLine({ start: { x: 40, y: 60 }, end: { x: width - 40, y: 60 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  page.drawText('Terima kasih atas kepercayaan Anda — Bizgrow ERP', { x: 40, y: 45, size: 8, font, color: gray });
  page.drawText('bizgrow.id', { x: width - 90, y: 45, size: 8, font, color: blue });

  return doc.save();
}

/**
 * Generate Laporan Keuangan PDF sederhana
 */
export async function generateLaporanPDF(data) {
  const { unitName, periode, masuk, keluar, laba, transactions = [] } = data;

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const blue = rgb(0.07, 0.25, 0.75);
  const green = rgb(0.05, 0.55, 0.25);
  const red = rgb(0.75, 0.1, 0.1);
  const gray = rgb(0.5, 0.5, 0.5);

  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: blue });
  page.drawText('LAPORAN KEUANGAN', { x: 40, y: height - 30, size: 16, font: fontBold, color: rgb(1,1,1) });
  page.drawText(unitName, { x: 40, y: height - 50, size: 10, font, color: rgb(0.8, 0.9, 1) });
  page.drawText(periode, { x: width - 160, y: height - 40, size: 10, font, color: rgb(0.8, 0.9, 1) });

  let y = height - 100;
  page.drawText('Ringkasan', { x: 40, y, size: 12, font: fontBold, color: rgb(0,0,0) });
  y -= 20;

  const summaryItems = [
    { l: 'Total Pemasukan', v: IDR(masuk), c: green },
    { l: 'Total Pengeluaran', v: IDR(keluar), c: red },
    { l: 'Laba / Rugi Bersih', v: IDR(laba), c: laba >= 0 ? green : red },
  ];

  for (const s of summaryItems) {
    page.drawText(s.l, { x: 40, y, size: 10, font, color: gray });
    page.drawText(s.v, { x: 300, y, size: 10, font: fontBold, color: s.c });
    y -= 18;
  }

  y -= 10;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 20;
  page.drawText('Detail Transaksi', { x: 40, y, size: 11, font: fontBold, color: rgb(0, 0, 0) });
  y -= 20;

  for (const tx of transactions.slice(0, 30)) {
    const isMasuk = tx.kategoriTrx === 'MASUK';
    page.drawText(new Date(tx.tanggal).toLocaleDateString('id-ID'), { x: 40, y, size: 8, font, color: gray });
    page.drawText(String(tx.keterangan || '').substring(0, 45), { x: 110, y, size: 8, font, color: rgb(0, 0, 0) });
    page.drawText(IDR(tx.nominal), { x: 420, y, size: 8, font: fontBold, color: isMasuk ? green : red });
    y -= 15;
    if (y < 60) break;
  }

  page.drawText('Digenerate oleh Bizgrow ERP · bizgrow.id', { x: 40, y: 30, size: 7, font, color: gray });

  return doc.save();
}
