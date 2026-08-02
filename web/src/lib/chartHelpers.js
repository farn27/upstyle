/**
 * Chart helpers — preset data builders untuk Chart.js
 * Pakai bersama komponen Chart.svelte
 */

const COLORS = {
  blue:   'rgb(59, 130, 246)',
  green:  'rgb(34, 197, 94)',
  red:    'rgb(239, 68, 68)',
  orange: 'rgb(249, 115, 22)',
  purple: 'rgb(168, 85, 247)',
  yellow: 'rgb(234, 179, 8)',
  teal:   'rgb(20, 184, 166)',
  indigo: 'rgb(99, 102, 241)',
  slate:  'rgb(100, 116, 139)',
};

const COLORS_ALPHA = (color, a = 0.15) => color.replace('rgb', 'rgba').replace(')', `, ${a})`);

/**
 * Bar chart arus kas (masuk vs keluar per bulan)
 * @param {Array<{bulan: string, masuk: number, keluar: number}>} data
 */
export function arusKasChart(data) {
  return {
    labels: data.map(d => d.bulan),
    datasets: [
      {
        label: 'Pemasukan',
        data: data.map(d => d.masuk),
        backgroundColor: COLORS_ALPHA(COLORS.green, 0.8),
        borderColor: COLORS.green,
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Pengeluaran',
        data: data.map(d => d.keluar),
        backgroundColor: COLORS_ALPHA(COLORS.red, 0.8),
        borderColor: COLORS.red,
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };
}

/**
 * Line chart trend laba bersih
 * @param {Array<{bulan: string, laba: number}>} data
 */
export function labaChart(data) {
  return {
    labels: data.map(d => d.bulan),
    datasets: [{
      label: 'Laba Bersih',
      data: data.map(d => d.laba),
      borderColor: COLORS.indigo,
      backgroundColor: COLORS_ALPHA(COLORS.indigo, 0.1),
      fill: true,
      tension: 0.4,
      pointBackgroundColor: COLORS.indigo,
      pointRadius: 4,
    }],
  };
}

/**
 * Doughnut chart kategori transaksi
 * @param {Array<{label: string, value: number}>} data
 */
export function kategoriChart(data) {
  const palette = [COLORS.blue, COLORS.green, COLORS.orange, COLORS.purple, COLORS.teal, COLORS.red, COLORS.yellow];
  return {
    labels: data.map(d => d.label),
    datasets: [{
      data: data.map(d => d.value),
      backgroundColor: data.map((_, i) => COLORS_ALPHA(palette[i % palette.length], 0.85)),
      borderColor: data.map((_, i) => palette[i % palette.length]),
      borderWidth: 2,
    }],
  };
}

/**
 * Bar chart top produk terlaris
 * @param {Array<{nama: string, qty: number, revenue: number}>} data
 */
export function topProdukChart(data) {
  return {
    labels: data.map(d => d.nama.substring(0, 20)),
    datasets: [{
      label: 'Terjual (qty)',
      data: data.map(d => d.qty),
      backgroundColor: COLORS_ALPHA(COLORS.blue, 0.8),
      borderColor: COLORS.blue,
      borderWidth: 1,
      borderRadius: 4,
      yAxisID: 'y',
    }, {
      label: 'Revenue',
      data: data.map(d => d.revenue),
      backgroundColor: COLORS_ALPHA(COLORS.green, 0.8),
      borderColor: COLORS.green,
      borderWidth: 1,
      borderRadius: 4,
      yAxisID: 'y1',
      type: 'line',
    }],
  };
}

/**
 * Pie chart metode pembayaran POS
 * @param {Array<{method: string, count: number}>} data
 */
export function paymentMethodChart(data) {
  const palette = [COLORS.blue, COLORS.green, COLORS.purple, COLORS.orange, COLORS.teal];
  return {
    labels: data.map(d => d.method),
    datasets: [{
      data: data.map(d => d.count),
      backgroundColor: palette.slice(0, data.length).map(c => COLORS_ALPHA(c, 0.85)),
      borderColor: palette.slice(0, data.length),
      borderWidth: 2,
    }],
  };
}

/**
 * Line chart absensi karyawan per bulan
 * @param {Array<{bulan: string, hadir: number, alfa: number, izin: number}>} data
 */
export function absensiChart(data) {
  return {
    labels: data.map(d => d.bulan),
    datasets: [
      { label: 'Hadir', data: data.map(d => d.hadir), borderColor: COLORS.green, backgroundColor: COLORS_ALPHA(COLORS.green, 0.1), tension: 0.3, fill: true },
      { label: 'Alfa', data: data.map(d => d.alfa), borderColor: COLORS.red, backgroundColor: COLORS_ALPHA(COLORS.red, 0.1), tension: 0.3, fill: true },
      { label: 'Izin', data: data.map(d => d.izin), borderColor: COLORS.orange, backgroundColor: COLORS_ALPHA(COLORS.orange, 0.1), tension: 0.3, fill: true },
    ],
  };
}

/**
 * Radar chart BI metrics
 * @param {{ margin: number, efficiency: number, integrityScore: number, cashRunway: number, aiConfidence: number }} bi
 */
export function biRadarChart(bi) {
  return {
    labels: ['Margin (%)', 'Efisiensi', 'Health Score', 'Cash Runway', 'AI Confidence'],
    datasets: [{
      label: 'Metrik Bisnis',
      data: [
        Math.min(100, bi.margin || 0),
        Math.min(100, 100 - (bi.efficiency || 0)),
        (bi.integrityScore || 0) * 10,
        Math.min(100, (bi.cashRunway || 0) * 10),
        bi.aiConfidence || 0,
      ],
      borderColor: COLORS.indigo,
      backgroundColor: COLORS_ALPHA(COLORS.indigo, 0.2),
      pointBackgroundColor: COLORS.indigo,
      pointRadius: 4,
    }],
  };
}
