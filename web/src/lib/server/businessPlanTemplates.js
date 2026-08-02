/**
 * Business Plan Templates
 * Maps business categories to seeded data across all modules.
 * Used by the Business Planning Wizard to auto-populate:
 * - Products / Kategori Produk
 * - Employees (template structure)
 * - Chart of Accounts (COA)
 * - Suppliers
 * - ABC Categories
 * - Tax Rates
 * - CRM Pipeline Stages
 * - POS Config
 */

// ─── Mapping kategori bisnis → COA type key ──────────────────────────────────
export const CATEGORY_TO_COA = {
  FNB_RESTO: 'RESTORAN',
  FNB_CATERING: 'KATERING',
  FNB_COFFEE_ROASTERY: 'CAFE',
  FNB_BAR_CLUB: 'CAFE',
  FNB_PRODUKSI: 'GROSIR',
  FNB_FRANCHISE: 'GROSIR',
  RETAIL_MINIMARKET: 'MINIMARKET',
  RETAIL_FASHION: 'BUTIK',
  RETAIL_BEAUTY: 'SALON',
  RETAIL_ELECTRONIC: 'MINIMARKET',
  RETAIL_FURNITURE: 'GROSIR',
  RETAIL_JEWELRY: 'GROSIR',
  RETAIL_PETSHOP: 'MINIMARKET',
  RETAIL_SPORTS: 'MINIMARKET',
  RETAIL_BOOKSTORE: 'MINIMARKET',
  RETAIL_PHARMACY: 'KLINIK',
  JASA_BARBER: 'SALON',
  JASA_LAUNDRY: 'LAUNDRY',
  JASA_TEKNIK: 'BENGKEL',
  JASA_KONSULTASI: 'SOFTWARE',
  JASA_PHOTOGRAPHY: 'EVENT',
  JASA_LOGISTIK: 'GROSIR',
  JASA_CLEANING: 'LAUNDRY',
  JASA_SECURITY: 'GROSIR',
  JASA_RECRUITMENT: 'SOFTWARE',
  HEALTH_CLINIC: 'KLINIK',
  HEALTH_DENTAL: 'KLINIK',
  HEALTH_AESTHETIC: 'SALON',
  HEALTH_LABORATORY: 'KLINIK',
  HEALTH_VETERINARY: 'KLINIK',
  PHARMA_MEDICAL: 'KLINIK',
  MANUFAKTUR: 'KONSTRUKSI',
  MANUFAKTUR_CHEMICAL: 'KONSTRUKSI',
  MANUFAKTUR_TEXTILE: 'BUTIK',
  CONSTRUCTION: 'KONSTRUKSI',
  CONSTRUCTION_ARCHITECT: 'SOFTWARE',
  TECH_SOFTWARE: 'SOFTWARE',
  TECH_SAAS: 'SAAS',
  TECH_FINTECH: 'SAAS',
  TOURISM_HOTEL: 'EVENT',
  TOURISM_TRAVEL: 'EVENT',
  TOURISM_MICE: 'EVENT',
  EDUCATION_COURSE: 'SOFTWARE',
  AGRIBISNIS: 'AGRIBISNIS',
  PROPERTY_DEV: 'PROPERTI',
  DEFAULT: 'MINIMARKET',
};

// ─── Template produk per kategori bisnis ─────────────────────────────────────
export const PRODUCT_TEMPLATES = {
  FNB_RESTO: [
    { nama: 'Nasi Goreng Spesial', sku: 'MKN-001', hargaBeli: 8000, hargaJual: 25000, stok: 100, kategori: 'MAKANAN UTAMA' },
    { nama: 'Mie Goreng', sku: 'MKN-002', hargaBeli: 7000, hargaJual: 22000, stok: 100, kategori: 'MAKANAN UTAMA' },
    { nama: 'Es Teh Manis', sku: 'MNM-001', hargaBeli: 2000, hargaJual: 8000, stok: 200, kategori: 'MINUMAN' },
    { nama: 'Es Jeruk', sku: 'MNM-002', hargaBeli: 3000, hargaJual: 10000, stok: 200, kategori: 'MINUMAN' },
    { nama: 'Kentang Goreng', sku: 'SNK-001', hargaBeli: 5000, hargaJual: 15000, stok: 50, kategori: 'SNACK & DESSERT' },
  ],
  FNB_COFFEE_ROASTERY: [
    { nama: 'Espresso Single Shot', sku: 'KPI-001', hargaBeli: 5000, hargaJual: 18000, stok: 200, kategori: 'KOPI' },
    { nama: 'Kopi Susu', sku: 'KPI-002', hargaBeli: 8000, hargaJual: 25000, stok: 200, kategori: 'KOPI' },
    { nama: 'Matcha Latte', sku: 'MNM-001', hargaBeli: 9000, hargaJual: 28000, stok: 150, kategori: 'NON-KOPI' },
    { nama: 'Croissant', sku: 'SNK-001', hargaBeli: 8000, hargaJual: 22000, stok: 30, kategori: 'PASTRY' },
  ],
  RETAIL_FASHION: [
    { nama: 'Kaos Polos Premium', sku: 'ATS-001', hargaBeli: 45000, hargaJual: 95000, stok: 50, kategori: 'ATASAN' },
    { nama: 'Kemeja Casual', sku: 'ATS-002', hargaBeli: 80000, hargaJual: 175000, stok: 30, kategori: 'ATASAN' },
    { nama: 'Celana Chino', sku: 'BWH-001', hargaBeli: 90000, hargaJual: 200000, stok: 30, kategori: 'BAWAHAN' },
    { nama: 'Topi Baseball', sku: 'AKS-001', hargaBeli: 25000, hargaJual: 65000, stok: 40, kategori: 'AKSESORIS' },
  ],
  RETAIL_MINIMARKET: [
    { nama: 'Indomie Goreng', sku: 'MKN-001', hargaBeli: 3000, hargaJual: 3500, stok: 200, kategori: 'SEMBAKO' },
    { nama: 'Aqua 600ml', sku: 'MNM-001', hargaBeli: 2500, hargaJual: 4000, stok: 100, kategori: 'MINUMAN' },
    { nama: 'Rokok Surya 12', sku: 'RKK-001', hargaBeli: 18000, hargaJual: 20000, stok: 50, kategori: 'ROKOK' },
    { nama: 'Sabun Lifebuoy', sku: 'KBR-001', hargaBeli: 5000, hargaJual: 7500, stok: 60, kategori: 'KEBERSIHAN' },
  ],
  JASA_BARBER: [
    { nama: 'Potong Rambut Reguler', sku: 'JAS-001', hargaBeli: 10000, hargaJual: 35000, stok: 999, kategori: 'GUNTING' },
    { nama: 'Cukur + Cuci Rambut', sku: 'JAS-002', hargaBeli: 15000, hargaJual: 55000, stok: 999, kategori: 'GUNTING' },
    { nama: 'Catok Rambut', sku: 'TRT-001', hargaBeli: 20000, hargaJual: 75000, stok: 999, kategori: 'TREATMENT' },
    { nama: 'Hair Wax Premium', sku: 'PRD-001', hargaBeli: 25000, hargaJual: 60000, stok: 20, kategori: 'PRODUK' },
  ],
  JASA_LAUNDRY: [
    { nama: 'Cuci Kiloan (per Kg)', sku: 'LND-001', hargaBeli: 3000, hargaJual: 7000, stok: 999, kategori: 'KILOAN' },
    { nama: 'Cuci Satuan - Jas', sku: 'LND-002', hargaBeli: 15000, hargaJual: 35000, stok: 999, kategori: 'SATUAN' },
    { nama: 'Cuci Karpet (per m2)', sku: 'LND-003', hargaBeli: 10000, hargaJual: 25000, stok: 999, kategori: 'SATUAN' },
    { nama: 'Express 1 Hari', sku: 'LND-004', hargaBeli: 5000, hargaJual: 15000, stok: 999, kategori: 'KILOAN' },
  ],
  HEALTH_CLINIC: [
    { nama: 'Konsultasi Dokter Umum', sku: 'MED-001', hargaBeli: 0, hargaJual: 75000, stok: 999, kategori: 'KONSULTASI' },
    { nama: 'Cek Darah Lengkap', sku: 'LAB-001', hargaBeli: 50000, hargaJual: 120000, stok: 999, kategori: 'LABORATORIUM' },
    { nama: 'Infus Cairan NaCl', sku: 'OBT-001', hargaBeli: 20000, hargaJual: 75000, stok: 50, kategori: 'TINDAKAN' },
    { nama: 'Paracetamol 500mg', sku: 'OBT-002', hargaBeli: 1000, hargaJual: 5000, stok: 200, kategori: 'OBAT' },
  ],
  JASA_TEKNIK: [
    { nama: 'Service AC Split 1PK', sku: 'SRV-001', hargaBeli: 50000, hargaJual: 150000, stok: 999, kategori: 'SERVICE AC' },
    { nama: 'Isi Freon R32', sku: 'SRV-002', hargaBeli: 80000, hargaJual: 200000, stok: 999, kategori: 'SERVICE AC' },
    { nama: 'Service Kulkas', sku: 'SRV-003', hargaBeli: 60000, hargaJual: 175000, stok: 999, kategori: 'SERVICE ELEKTRONIK' },
    { nama: 'Filter Udara AC', sku: 'SPP-001', hargaBeli: 25000, hargaJual: 65000, stok: 30, kategori: 'SPAREPART' },
  ],
  TECH_SOFTWARE: [
    { nama: 'Pembuatan Website Company Profile', sku: 'DEV-001', hargaBeli: 2000000, hargaJual: 5000000, stok: 999, kategori: 'WEBSITE' },
    { nama: 'Aplikasi Mobile (per Platform)', sku: 'DEV-002', hargaBeli: 10000000, hargaJual: 25000000, stok: 999, kategori: 'MOBILE APP' },
    { nama: 'Maintenance Bulanan', sku: 'MNT-001', hargaBeli: 500000, hargaJual: 1500000, stok: 999, kategori: 'MAINTENANCE' },
    { nama: 'Domain .com 1 Tahun', sku: 'HST-001', hargaBeli: 150000, hargaJual: 250000, stok: 999, kategori: 'HOSTING' },
  ],
  AGRIBISNIS: [
    { nama: 'Beras Premium 5kg', sku: 'AGR-001', hargaBeli: 60000, hargaJual: 85000, stok: 100, kategori: 'KOMODITAS' },
    { nama: 'Bibit Cabai F1', sku: 'BBT-001', hargaBeli: 5000, hargaJual: 12000, stok: 500, kategori: 'BIBIT' },
    { nama: 'Pupuk NPK 50kg', sku: 'PPK-001', hargaBeli: 250000, hargaJual: 320000, stok: 50, kategori: 'PUPUK' },
    { nama: 'Sayur Kangkung 1kg', sku: 'SYR-001', hargaBeli: 3000, hargaJual: 8000, stok: 200, kategori: 'SAYURAN' },
  ],
  DEFAULT: [
    { nama: 'Produk Utama A', sku: 'PRD-001', hargaBeli: 50000, hargaJual: 100000, stok: 50, kategori: 'UMUM' },
    { nama: 'Produk Utama B', sku: 'PRD-002', hargaBeli: 30000, hargaJual: 75000, stok: 50, kategori: 'UMUM' },
    { nama: 'Layanan Jasa', sku: 'JAS-001', hargaBeli: 0, hargaJual: 150000, stok: 999, kategori: 'JASA' },
  ],
};

// ─── Template karyawan per kategori ──────────────────────────────────────────
export const EMPLOYEE_TEMPLATES = {
  FNB_RESTO: [
    { fullName: 'Kepala Dapur (Template)', position: 'Chef', salary: 3500000, role: 'manager', pin: '1234' },
    { fullName: 'Kasir (Template)', position: 'Kasir', salary: 2000000, role: 'cashier', pin: '1111' },
    { fullName: 'Waiter (Template)', position: 'Pelayan', salary: 1800000, role: 'staff', pin: '2222' },
  ],
  FNB_COFFEE_ROASTERY: [
    { fullName: 'Barista Senior (Template)', position: 'Barista', salary: 3000000, role: 'staff', pin: '1234' },
    { fullName: 'Kasir Cafe (Template)', position: 'Kasir', salary: 2000000, role: 'cashier', pin: '1111' },
  ],
  RETAIL_FASHION: [
    { fullName: 'SPG Senior (Template)', position: 'Sales Promotion Girl', salary: 2500000, role: 'staff', pin: '1234' },
    { fullName: 'Kasir Butik (Template)', position: 'Kasir', salary: 2000000, role: 'cashier', pin: '1111' },
    { fullName: 'Gudang (Template)', position: 'Staf Gudang', salary: 2000000, role: 'staff', pin: '3333' },
  ],
  RETAIL_MINIMARKET: [
    { fullName: 'Kasir Shift 1 (Template)', position: 'Kasir', salary: 2200000, role: 'cashier', pin: '1111' },
    { fullName: 'Kasir Shift 2 (Template)', position: 'Kasir', salary: 2200000, role: 'cashier', pin: '2222' },
    { fullName: 'Pramuniaga (Template)', position: 'Pramuniaga', salary: 2000000, role: 'staff', pin: '3333' },
  ],
  JASA_BARBER: [
    { fullName: 'Barber Senior (Template)', position: 'Barber', salary: 3000000, role: 'staff', pin: '1234' },
    { fullName: 'Kasir (Template)', position: 'Kasir', salary: 1800000, role: 'cashier', pin: '1111' },
  ],
  JASA_LAUNDRY: [
    { fullName: 'Operator Mesin (Template)', position: 'Operator', salary: 2000000, role: 'staff', pin: '1234' },
    { fullName: 'Kasir Laundry (Template)', position: 'Kasir', salary: 1800000, role: 'cashier', pin: '1111' },
  ],
  HEALTH_CLINIC: [
    { fullName: 'Dokter Umum (Template)', position: 'Dokter', salary: 8000000, role: 'manager', pin: '1234' },
    { fullName: 'Perawat (Template)', position: 'Perawat', salary: 3000000, role: 'staff', pin: '2222' },
    { fullName: 'Admin Klinik (Template)', position: 'Admin', salary: 2500000, role: 'cashier', pin: '1111' },
  ],
  TECH_SOFTWARE: [
    { fullName: 'Project Manager (Template)', position: 'PM', salary: 10000000, role: 'manager', pin: '1234' },
    { fullName: 'Developer Senior (Template)', position: 'Developer', salary: 8000000, role: 'staff', pin: '2222' },
    { fullName: 'UI/UX Designer (Template)', position: 'Designer', salary: 6000000, role: 'staff', pin: '3333' },
  ],
  DEFAULT: [
    { fullName: 'Manajer (Template)', position: 'Manajer', salary: 5000000, role: 'manager', pin: '1234' },
    { fullName: 'Staf Operasional (Template)', position: 'Staf', salary: 2500000, role: 'staff', pin: '2222' },
    { fullName: 'Kasir (Template)', position: 'Kasir', salary: 2000000, role: 'cashier', pin: '1111' },
  ],
};

// ─── Template supplier per kategori ──────────────────────────────────────────
export const SUPPLIER_TEMPLATES = {
  FNB_RESTO: [
    { namaSupplier: 'Pasar Induk (Bahan Baku)', kontak: JSON.stringify({ phone: '-', category: 'Bahan Baku', address: 'Pasar Induk' }) },
    { namaSupplier: 'Distributor Minuman', kontak: JSON.stringify({ phone: '-', category: 'Minuman', address: '-' }) },
  ],
  RETAIL_FASHION: [
    { namaSupplier: 'Konveksi Bandung', kontak: JSON.stringify({ phone: '-', category: 'Pakaian', address: 'Bandung' }) },
    { namaSupplier: 'Distributor Aksesoris', kontak: JSON.stringify({ phone: '-', category: 'Aksesoris', address: '-' }) },
  ],
  RETAIL_MINIMARKET: [
    { namaSupplier: 'Indomarco (FMCG)', kontak: JSON.stringify({ phone: '-', category: 'FMCG', address: '-' }) },
    { namaSupplier: 'Supplier Rokok', kontak: JSON.stringify({ phone: '-', category: 'Rokok', address: '-' }) },
  ],
  JASA_TEKNIK: [
    { namaSupplier: 'Toko Sparepart AC', kontak: JSON.stringify({ phone: '-', category: 'Sparepart', address: '-' }) },
  ],
  TECH_SOFTWARE: [
    { namaSupplier: 'AWS/Cloud Provider', kontak: JSON.stringify({ phone: '-', category: 'Cloud', address: 'Online' }) },
  ],
  DEFAULT: [
    { namaSupplier: 'Supplier Utama (Template)', kontak: JSON.stringify({ phone: '-', category: 'Umum', address: '-' }) },
  ],
};

// ─── Template ABC kategori transaksi ─────────────────────────────────────────
export const ABC_CATEGORY_TEMPLATES = {
  FNB_RESTO: [
    { namaKategori: 'Penjualan Makanan', abcLevel: 'A', jenis: 'masuk' },
    { namaKategori: 'Penjualan Minuman', abcLevel: 'A', jenis: 'masuk' },
    { namaKategori: 'Pembelian Bahan Baku', abcLevel: 'A', jenis: 'keluar' },
    { namaKategori: 'Gaji Karyawan', abcLevel: 'B', jenis: 'keluar' },
    { namaKategori: 'Sewa Tempat', abcLevel: 'B', jenis: 'keluar' },
    { namaKategori: 'Listrik & Gas', abcLevel: 'C', jenis: 'keluar' },
  ],
  RETAIL_FASHION: [
    { namaKategori: 'Penjualan Pakaian', abcLevel: 'A', jenis: 'masuk' },
    { namaKategori: 'Penjualan Online', abcLevel: 'A', jenis: 'masuk' },
    { namaKategori: 'Pembelian Stok', abcLevel: 'A', jenis: 'keluar' },
    { namaKategori: 'Biaya Iklan Digital', abcLevel: 'B', jenis: 'keluar' },
    { namaKategori: 'Gaji SPG', abcLevel: 'B', jenis: 'keluar' },
    { namaKategori: 'Sewa Stand/Toko', abcLevel: 'B', jenis: 'keluar' },
  ],
  TECH_SOFTWARE: [
    { namaKategori: 'Pendapatan Proyek', abcLevel: 'A', jenis: 'masuk' },
    { namaKategori: 'Retainer Maintenance', abcLevel: 'A', jenis: 'masuk' },
    { namaKategori: 'Gaji Developer', abcLevel: 'A', jenis: 'keluar' },
    { namaKategori: 'Biaya Cloud/Server', abcLevel: 'B', jenis: 'keluar' },
    { namaKategori: 'Lisensi Tools', abcLevel: 'C', jenis: 'keluar' },
  ],
  DEFAULT: [
    { namaKategori: 'Penjualan Produk/Jasa', abcLevel: 'A', jenis: 'masuk' },
    { namaKategori: 'Pembelian Bahan/Stok', abcLevel: 'A', jenis: 'keluar' },
    { namaKategori: 'Gaji Karyawan', abcLevel: 'B', jenis: 'keluar' },
    { namaKategori: 'Operasional Umum', abcLevel: 'C', jenis: 'keluar' },
  ],
};

// ─── Template tarif pajak ─────────────────────────────────────────────────────
export const TAX_RATE_TEMPLATES = {
  DEFAULT: [
    { namaPajak: 'PPN 11%', persentase: '11.00', tipe: 'PPN', isDefault: 1 },
    { namaPajak: 'PPh 21 (Karyawan)', persentase: '5.00', tipe: 'PPH', isDefault: 0 },
  ],
  KONSTRUKSI: [
    { namaPajak: 'PPh Final Konstruksi 2.65%', persentase: '2.65', tipe: 'PPH', isDefault: 1 },
    { namaPajak: 'PPN 11%', persentase: '11.00', tipe: 'PPN', isDefault: 0 },
  ],
  HEALTH_CLINIC: [
    { namaPajak: 'PPN Jasa Medis (Bebas)', persentase: '0.00', tipe: 'PPN', isDefault: 1 },
    { namaPajak: 'PPh 21 (Dokter)', persentase: '5.00', tipe: 'PPH', isDefault: 0 },
  ],
};

// ─── Helper: ambil template dengan fallback ke DEFAULT ────────────────────────
export function getTemplate(map, kategori) {
  return map[kategori] || map[
    // Coba match prefix (FNB_RESTO → FNB)
    Object.keys(map).find(k => kategori?.startsWith(k)) 
  ] || map['DEFAULT'] || [];
}

// ─── Daftar semua kategori bisnis (untuk dropdown wizard) ─────────────────────
export const ALL_BUSINESS_CATEGORIES = [
  // F&B
  { value: 'FNB_RESTO', label: 'Restoran / Warung Makan', group: 'F&B' },
  { value: 'FNB_CATERING', label: 'Katering', group: 'F&B' },
  { value: 'FNB_COFFEE_ROASTERY', label: 'Cafe / Kopi', group: 'F&B' },
  { value: 'FNB_BAR_CLUB', label: 'Bar / Club', group: 'F&B' },
  { value: 'FNB_PRODUKSI', label: 'Produksi Makanan/Minuman', group: 'F&B' },
  { value: 'FNB_FRANCHISE', label: 'Franchise F&B', group: 'F&B' },
  // Retail
  { value: 'RETAIL_MINIMARKET', label: 'Minimarket / Toko Kelontong', group: 'Retail' },
  { value: 'RETAIL_FASHION', label: 'Fashion / Butik Pakaian', group: 'Retail' },
  { value: 'RETAIL_BEAUTY', label: 'Kosmetik / Kecantikan', group: 'Retail' },
  { value: 'RETAIL_ELECTRONIC', label: 'Elektronik / Gadget', group: 'Retail' },
  { value: 'RETAIL_FURNITURE', label: 'Furnitur / Interior', group: 'Retail' },
  { value: 'RETAIL_JEWELRY', label: 'Perhiasan / Emas', group: 'Retail' },
  { value: 'RETAIL_PETSHOP', label: 'Pet Shop', group: 'Retail' },
  { value: 'RETAIL_SPORTS', label: 'Olahraga / Outdoor', group: 'Retail' },
  { value: 'RETAIL_BOOKSTORE', label: 'Toko Buku / ATK', group: 'Retail' },
  { value: 'RETAIL_PHARMACY', label: 'Apotek', group: 'Retail' },
  // Jasa
  { value: 'JASA_BARBER', label: 'Barbershop / Salon', group: 'Jasa' },
  { value: 'JASA_LAUNDRY', label: 'Laundry', group: 'Jasa' },
  { value: 'JASA_TEKNIK', label: 'Service Elektronik / Bengkel', group: 'Jasa' },
  { value: 'JASA_KONSULTASI', label: 'Konsultan / Advisor', group: 'Jasa' },
  { value: 'JASA_PHOTOGRAPHY', label: 'Fotografi / Videografi', group: 'Jasa' },
  { value: 'JASA_LOGISTIK', label: 'Logistik / Ekspedisi', group: 'Jasa' },
  { value: 'JASA_CLEANING', label: 'Cleaning Service', group: 'Jasa' },
  { value: 'JASA_RECRUITMENT', label: 'Rekrutmen / HR Outsource', group: 'Jasa' },
  // Kesehatan
  { value: 'HEALTH_CLINIC', label: 'Klinik / Puskesmas', group: 'Kesehatan' },
  { value: 'HEALTH_DENTAL', label: 'Klinik Gigi', group: 'Kesehatan' },
  { value: 'HEALTH_AESTHETIC', label: 'Klinik Estetik / Kecantikan', group: 'Kesehatan' },
  { value: 'HEALTH_VETERINARY', label: 'Klinik Hewan', group: 'Kesehatan' },
  // Teknologi
  { value: 'TECH_SOFTWARE', label: 'Software House / IT', group: 'Teknologi' },
  { value: 'TECH_SAAS', label: 'SaaS / Startup Digital', group: 'Teknologi' },
  // Industri
  { value: 'MANUFAKTUR', label: 'Manufaktur / Pabrik', group: 'Industri' },
  { value: 'CONSTRUCTION', label: 'Konstruksi / Kontraktor', group: 'Industri' },
  { value: 'AGRIBISNIS', label: 'Agribisnis / Pertanian', group: 'Industri' },
  { value: 'PROPERTY_DEV', label: 'Properti / Developer', group: 'Industri' },
  // Edukasi & Lainnya
  { value: 'EDUCATION_COURSE', label: 'Kursus / Lembaga Pendidikan', group: 'Edukasi' },
  { value: 'TOURISM_HOTEL', label: 'Hotel / Penginapan', group: 'Pariwisata' },
  { value: 'TOURISM_TRAVEL', label: 'Travel Agent / Wisata', group: 'Pariwisata' },
  { value: 'MEDIA_PRODUCTION', label: 'Produksi Media / Content', group: 'Media' },
  { value: 'DEFAULT', label: 'Bisnis Lainnya', group: 'Lainnya' },
];
