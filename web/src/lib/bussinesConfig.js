// src/lib/businessConfig.js

export const BASE = {
    TECH: [
        { name: 'versi_rilis', label: 'Versi/Build Number', type: 'text' },
        { name: 'is_cloud_native', label: 'Infrastruktur Cloud?', type: 'checkbox' },
        { name: 'masa_bakti', label: 'SLA Support (Bulan)', type: 'number' }
    ],
    HEAVY: [
        { name: 'sertifikasi_k3', label: 'Standar Keamanan/K3', type: 'text' },
        { name: 'berat_tonase', label: 'Berat Bersih (Kg/Ton)', type: 'number' },
        { name: 'is_b3', label: 'Mengandung Limbah B3?', type: 'checkbox' }
    ],
    MEDICAL: [
        { name: 'izin_edar', label: 'No. Izin Edar/BPOM', type: 'text' },
        { name: 'suhu_simpan', label: 'Suhu Simpan Standar (°C)', type: 'number' },
        { name: 'tgl_kadaluarsa', label: 'Tanggal Kadaluarsa', type: 'date' }
    ],
    LEGAL_FIN: [
        { name: 'yuridiksi', label: 'Wilayah Hukum/Yuridiksi', type: 'text' },
        { name: 'klasifikasi_risiko', label: 'Risk Scoring (1-10)', type: 'number' },
        { name: 'is_audit_ready', label: 'Siap Audit Eksternal?', type: 'checkbox' }
    ]
};

export const contextMap = {
    // === SEKTOR F&B (FOOD & BEVERAGE) ===
    'FNB_RESTO': { item: 'Menu Kudapan', qty: 'Porsi', variant: 'Modifikator/Level' },
    'FNB_PRODUKSI': { item: 'Produk Jadi (FG)', qty: 'Batch/Lot', variant: 'SKU Kemasan' },
    'FNB_FRANCHISE': { item: 'Paket Kemitraan', qty: 'Outlet', variant: 'Tipe Lisensi' },
    'FNB_CATERING': { item: 'Menu Prasmanan', qty: 'Pax', variant: 'Kategori Diet' },
    'FNB_BAR_CLUB': { item: 'Beverage List', qty: 'Bottle/Glass', variant: 'Volume/Mixer' },
    'FNB_COFFEE_ROASTERY': { item: 'Green/Roasted Bean', qty: 'Kg', variant: 'Roast Profile' },

    // === SEKTOR RETAIL & GROSIR ===
    'RETAIL_FASHION': { item: 'Koleksi Artikel', qty: 'Pcs', variant: 'Size-Color-Matrix' },
    'RETAIL_MINIMARKET': { item: 'Stock Keeping Unit', qty: 'Unit/Ctn', variant: 'Gramasi/Kemasan' },
    'RETAIL_ELECTRONIC': { item: 'Unit Perangkat', qty: 'Unit', variant: 'Serial Number/Spek' },
    'RETAIL_BEAUTY': { item: 'Produk Kosmetik', qty: 'Item', variant: 'Shade/Volume' },
    'RETAIL_FURNITURE': { item: 'Mebel/Interior', qty: 'Set/Unit', variant: 'Material/Finishing' },
    'RETAIL_JEWELRY': { item: 'Perhiasan/Logam', qty: 'Gram/Karat', variant: 'Kadar/Sertifikasi' },
    'RETAIL_PETSHOP': { item: 'Pakan/Aksesoris', qty: 'Bag/Pcs', variant: 'Life-Stage/Berat' },
    'RETAIL_SPORTS': { item: 'Alat Olahraga', qty: 'Unit', variant: 'Tipe/Ukuran' },
    'RETAIL_BOOKSTORE': { item: 'Judul Buku/Atk', qty: 'Eksemplar', variant: 'Format Cover/Edisi' },
    'RETAIL_PHARMACY': { item: 'Sediaan Obat', qty: 'Strip/Box', variant: 'Dosis/Indikasi' },

    // === JASA PROFESIONAL & TEKNIS ===
    'JASA_KONSULTASI': { item: 'Mandays/SLA', qty: 'Proyek', variant: 'Tier Konsultan' },
    'JASA_LOGISTIK': { item: 'Manifest Kiriman', qty: 'Koli/CBM', variant: 'Layanan/Speed' },
    'JASA_LAUNDRY': { item: 'Layanan Cuci', qty: 'Kg/Pcs', variant: 'Treatment/Parfum' },
    'JASA_BARBER': { item: 'Service Treatment', qty: 'Sesi', variant: 'Skill Level' },
    'JASA_TEKNIK': { item: 'Work Order', qty: 'Unit', variant: 'Tingkat Kerusakan' },
    'JASA_SECURITY': { item: 'Plotting Personel', qty: 'Shift', variant: 'Kualifikasi (Gada)' },
    'JASA_CLEANING': { item: 'Scope Area', qty: 'm2', variant: 'Metode Cleaning' },
    'JASA_PHOTOGRAPHY': { item: 'Paket Shoot', qty: 'Sesi', variant: 'Output/Resolusi' },
    'JASA_RECRUITMENT': { item: 'Kandidat/Posisi', qty: 'Headcount', variant: 'Seniority Level' },

    // === KESEHATAN & SAINS ===
    'HEALTH_CLINIC': { item: 'Tindakan Medis', qty: 'Sesi', variant: 'Spesialisasi' },
    'HEALTH_LABORATORY': { item: 'Panel Pemeriksaan', qty: 'Sampel', variant: 'Parameter Uji' },
    'HEALTH_DENTAL': { item: 'Prosedur Gigi', qty: 'Tindakan', variant: 'Material Medis' },
    'HEALTH_VETERINARY': { item: 'Layanan Medik Vet', qty: 'Ekor', variant: 'Jenis Spesies' },
    'HEALTH_AESTHETIC': { item: 'Treatment Kecantikan', qty: 'Sesi', variant: 'Produk/Alat' },
    'PHARMA_MEDICAL': { item: 'Alkes/Farmasi', qty: 'Lot/Batch', variant: 'Izin Edar/NIE' },

    // === INDUSTRI BERAT, ENERGI & PROPERTI ===
    'MANUFAKTUR': { item: 'Finished Goods', qty: 'Pallet/Lot', variant: 'QC Pass Standard' },
    'MANUFAKTUR_CHEMICAL': { item: 'Senyawa Kimia', qty: 'Drum/Liter', variant: 'Konsentrasi (%)' },
    'MANUFAKTUR_TEXTILE': { item: 'Roll Kain', qty: 'Yard/Meter', variant: 'GSM/Konstruksi' },
    'PROPERTY_DEV': { item: 'Inventory Unit', qty: 'Unit', variant: 'Tipe/Luas/Hadap' },
    'CONSTRUCTION': { item: 'Material/Jasa Sipil', qty: 'Volume', variant: 'Spesifikasi Teknis' },
    'CONSTRUCTION_ARCHITECT': { item: 'Design Brief', qty: 'Lembar/m2', variant: 'Style/Fase' },
    'ENERGY_MINING': { item: 'Hasil Tambang', qty: 'MT (Metric Ton)', variant: 'Grade/Caloric' },
    'ENERGY_RENEWABLE': { item: 'Kapasitas Panel/Turbin', qty: 'MWp/kWh', variant: 'Teknologi Sel' },
    'OIL_GAS_UPSTREAM': { item: 'Crude Oil/Gas', qty: 'Barrel/MMBTU', variant: 'API Gravity' },

    // === TEKNOLOGI & DIGITAL ===
    'TECH_SOFTWARE': { item: 'Lisensi Perangkat Lunak', qty: 'User/Instance', variant: 'Deployment Model' },
    'TECH_SAAS': { item: 'Subscription Plan', qty: 'Seats', variant: 'Billing Cycle' },
    'TECH_FINTECH': { item: 'Produk Keuangan', qty: 'Limit', variant: 'Credit Score' },
    'TECH_CYBER_SECURITY': { item: 'Security Audit', qty: 'IP/Asset', variant: 'Threat Level' },
    'TECH_DATA_CENTER': { item: 'Rack Space', qty: 'U Unit', variant: 'Bandwidth/Power' },
    'TECH_MEDIA': { item: 'Inventory Ad-Slot', qty: 'Impression', variant: 'Placement' },

    // === LOGISTIK & TRANSPORTASI ===
    'LOGISTICS_SHIPPING': { item: 'Ocean Freight', qty: 'TEUs/Container', variant: 'Incoterms' },
    'LOGISTICS_WAREHOUSING': { item: 'Storage Space', qty: 'CBM/Pallet', variant: 'Storage Type' },
    'LOGISTICS_AIR_FREIGHT': { item: 'Cargo Udara', qty: 'Chargeable Weight', variant: 'AWB Type' },
    'LOGISTICS_COLD_CHAIN': { item: 'Komoditas Beku', qty: 'Ton', variant: 'Suhu Simpan' },
    'AUTOMOTIVE_RENTAL': { item: 'Armada Sewa', qty: 'Unit/Day', variant: 'Tipe Kendaraan' },
    'AUTOMOTIVE_WORKSHOP': { item: 'Sparepart/Jasa', qty: 'Pcs/Jam', variant: 'Genuine/OEM' },

    // === EDUKASI, SOSIAL & PEMERINTAHAN ===
    'EDUCATION_COURSE': { item: 'Kurikulum/Modul', qty: 'Siswa', variant: 'Level Akreditasi' },
    'EDUCATION_UNIVERSITY': { item: 'SKS/Mata Kuliah', qty: 'Mahasiswa', variant: 'Fakultas' },
    'GOV_PUBLIC_SERVICE': { item: 'Layanan Publik', qty: 'Permohonan', variant: 'Jenis Perizinan' },
    'GOV_NONPROFIT': { item: 'Program Hibah', qty: 'Penerima', variant: 'Sumber Dana' },
    'RELIGIOUS_ORGANIZATION': { item: 'Kegiatan/Aset', qty: 'Jamaah', variant: 'Kategori Wakaf' },

    // === MEDIA & HIBURAN ===
    'MEDIA_PRODUCTION': { item: 'Footage/Scene', qty: 'Durasi', variant: 'Format/Codec' },
    'MEDIA_ADVERTISING': { item: 'Campaign Ads', qty: 'Reach', variant: 'Platform/Channel' },
    'TOURISM_TRAVEL': { item: 'Paket Wisata', qty: 'Pax', variant: 'Destinasi/Hotel' },
    'TOURISM_HOTEL': { item: 'Room Inventory', qty: 'Night', variant: 'Bed Type/View' },
    'TOURISM_MICE': { item: 'Event Package', qty: 'Audience', variant: 'Venue Layout' },

    // === KEUANGAN & LEGAL ===
    'FINANCE_INSURANCE': { item: 'Polis Proteksi', qty: 'Tertanggung', variant: 'Coverage Limit' },
    'FINANCE_INVESTMENT': { item: 'Instrumen Efek', qty: 'Lot/Unit', variant: 'Risk/Return Profile' },
    'LEGAL_LAW_FIRM': { item: 'Legal Case/Matter', qty: 'Hours', variant: 'Practice Area' },
    'ACCOUNTING_AUDIT': { item: 'Laporan Audit', qty: 'Entity', variant: 'Standard (IFRS/PSAK)' },

    'AGRIBISNIS': { item: 'Komoditas Hayati', qty: 'Ton/Kg', variant: 'Grade/Kadar Air' },
    'TELECOMMUNICATION': { item: 'Bandwidth/Sirkuit', qty: 'Mbps/Gbps', variant: 'Media Transmisi' },
    'DEFAULT': { item: 'Produk/Jasa', qty: 'Unit', variant: 'Variasi' }
};

export const extraFieldsMap = {
    'FNB_RESTO': [
        { name: 'no_halal', label: 'No. Sertifikat Halal', type: 'text' },
        { name: 'level_pedas', label: 'Opsi Level Pedas', type: 'text' },
        { name: 'is_vegan', label: 'Menu Vegan?', type: 'checkbox' }
    ],
    'FNB_PRODUKSI': [
        { name: 'batch_code', label: 'Kode Produksi/Batch', type: 'text' },
        { name: 'nie_bpom', label: 'Nomor NIE BPOM', type: 'text' },
        { name: 'exp_date', label: 'Tanggal Kadaluarsa', type: 'date' }
    ],
    'FNB_FRANCHISE': [
        { name: 'kode_outlet', label: 'ID Outlet/Cabang', type: 'text' },
        { name: 'tgl_kontrak', label: 'Masa Berlaku Lisensi', type: 'date' },
        { name: 'is_royalty_paid', label: 'Status Royalty Fee?', type: 'checkbox' }
    ],
    'FNB_CATERING': [
        { name: 'pax_minimum', label: 'Minimal Order (Pax)', type: 'number' },
        { name: 'dietary_restrictions', label: 'Catatan Alergi/Diet', type: 'text' }
    ],
    'FNB_BAR_CLUB': [
        { name: 'alkohol_content', label: 'Kadar Alkohol (%)', type: 'number' },
        { name: 'vibe_category', label: 'Kategori Mixer', type: 'text' }
    ],
    'FNB_COFFEE_ROASTERY': [
        { name: 'bean_origin', label: 'Asal Biji (Region)', type: 'text' },
        { name: 'moisture_level', label: 'Kadar Air (%)', type: 'number' },
        { name: 'roast_date', label: 'Tanggal Roasting', type: 'date' }
    ],
    'RETAIL_FASHION': [
        { name: 'material_kain', label: 'Komposisi Bahan', type: 'text' },
        { name: 'season', label: 'Musim (SS/FW)', type: 'text' }
    ],
    'RETAIL_MINIMARKET': [
        { name: 'rak_id', label: 'ID Posisi Rak', type: 'text' },
        { name: 'is_fmcg', label: 'Produk Cepat Laku?', type: 'checkbox' }
    ],
    'RETAIL_ELECTRONIC': [
        { name: 'masa_garansi', label: 'Garansi (Bulan)', type: 'number' },
        { name: 'daya_listrik', label: 'Konsumsi Daya (W)', type: 'number' },
        { name: 'is_official', label: 'Garansi Resmi?', type: 'checkbox' }
    ],
    'RETAIL_JEWELRY': [
        { name: 'kadar_karat', label: 'Kadar Karat (K)', type: 'number' },
        { name: 'no_sertifikat', label: 'No. Sertifikat GIA', type: 'text' },
        { name: 'gramasi_bersih', label: 'Berat Bersih (gr)', type: 'number' }
    ],
    'JASA_KONSULTASI': [
        { name: 'sla_jam', label: 'SLA Respon (Jam)', type: 'number' },
        { name: 'tier_expert', label: 'Level Keahlian', type: 'text' }
    ],
    'JASA_LOGISTIK': [
        { name: 'dimensi_koli', label: 'Dimensi (PxLxT)', type: 'text' },
        { name: 'is_asuransi', label: 'Wajib Asuransi?', type: 'checkbox' }
    ],
    'JASA_SECURITY': [
        { name: 'level_gada', label: 'Kualifikasi (Pratama/Madya)', type: 'text' },
        { name: 'is_armed', label: 'Membawa Senjata?', type: 'checkbox' }
    ],
    'HEALTH_CLINIC': [
        { name: 'sip_dokter', label: 'No. SIP Dokter', type: 'text' },
        { name: 'is_bpjs', label: 'Terima BPJS?', type: 'checkbox' }
    ],
    'PHARMA_MEDICAL': [
        { name: 'nie_edaran', label: 'No. Izin Edar BPOM', type: 'text' },
        { name: 'is_obat_keras', label: 'Golongan Obat Keras?', type: 'checkbox' },
        { name: 'suhu_optimum', label: 'Suhu Simpan (°C)', type: 'number' }
    ],
    'MANUFAKTUR': [
        { name: 'qc_passed_id', label: 'ID Inspektur QC', type: 'text' },
        { name: 'mesin_line', label: 'Line Produksi', type: 'text' }
    ],
    'MANUFAKTUR_CHEMICAL': [
        { name: 'cas_number', label: 'CAS Number (Registry)', type: 'text' },
        { name: 'ph_level', label: 'Tingkat pH', type: 'number' },
        { name: 'is_volatile', label: 'Mudah Menguap?', type: 'checkbox' }
    ],
    'MANUFAKTUR_TEXTILE': [
        { name: 'gsm_kain', label: 'Gramasi (GSM)', type: 'number' },
        { name: 'thread_count', label: 'Thread Count', type: 'number' }
    ],
    'PROPERTY_DEV': [
        { name: 'imb_pbg', label: 'No. IMB/PBG', type: 'text' },
        { name: 'luas_bangunan', label: 'Luas Bangunan (m2)', type: 'number' },
        { name: 'sertifikat_tipe', label: 'Tipe Sertifikat (SHM/HGB)', type: 'text' }
    ],
    'ENERGY_MINING': [
        { name: 'nilai_kalori', label: 'Caloric Value (GAR)', type: 'number' },
        { name: 'sulfur_content', label: 'Kandungan Sulfur (%)', type: 'number' },
        { name: 'izin_iup', label: 'Nomor Izin IUP', type: 'text' }
    ],
    'TECH_SAAS': [
        { name: 'uptime_sla', label: 'Uptime SLA (%)', type: 'number' },
        { name: 'is_api_open', label: 'Akses API Tersedia?', type: 'checkbox' }
    ],
    'TECH_FINTECH': [
        { name: 'no_izin_ojk', label: 'Izin OJK/BI', type: 'text' },
        { name: 'is_syariah', label: 'Kepatuhan Syariah?', type: 'checkbox' }
    ],
    'LOGISTICS_SHIPPING': [
        { name: 'vessel_imo', label: 'IMO Vessel Name', type: 'text' },
        { name: 'hs_code', label: 'HS Code (Export/Import)', type: 'text' },
        { name: 'is_dg', label: 'Dangerous Goods?', type: 'checkbox' }
    ],
    'AUTOMOTIVE_WORKSHOP': [
        { name: 'part_grade', label: 'Grade Part (OEM/KW)', type: 'text' },
        { name: 'garansi_jasa', label: 'Garansi Servis (Hari)', type: 'number' }
    ],
    'EDUCATION_COURSE': [
        { name: 'akreditasi', label: 'Level Akreditasi (A/B)', type: 'text' },
        { name: 'total_pertemuan', label: 'Jumlah Sesi', type: 'number' }
    ],
    'MEDIA_PRODUCTION': [
        { name: 'resolusi_file', label: 'Resolusi (4K/8K)', type: 'text' },
        { name: 'fps_count', label: 'Frame Rate (FPS)', type: 'number' }
    ],
    'TOURISM_HOTEL': [
        { name: 'star_rating', label: 'Rating Bintang (1-5)', type: 'number' },
        { name: 'is_breakfast', label: 'Include Sarapan?', type: 'checkbox' }
    ],
    'FINANCE_INSURANCE': [
        { name: 'limit_pertanggungan', label: 'Maks. Limit Klaim', type: 'number' },
        { name: 'premi_rate', label: 'Rate Premi (%)', type: 'number' }
    ],
    'LEGAL_LAW_FIRM': [
        { name: 'perkara_id', label: 'No. Perkara/Kasus', type: 'text' },
        { name: 'rate_per_hour', label: 'Billing Rate (IDR/Hr)', type: 'number' }
    ],
    'AGRIBISNIS': [
        { name: 'tgl_tanam', label: 'Tanggal Tanam', type: 'date' },
        { name: 'kadar_air', label: 'Kadar Air (%)', type: 'number' },
        { name: 'is_organik', label: 'Sertifikat Organik?', type: 'checkbox' }
    ],
    'TELECOMMUNICATION': [
        { name: 'link_capacity', label: 'Kapasitas Link (Gbps)', type: 'number' },
        { name: 'latency_ms', label: 'Target Latency (ms)', type: 'number' }
    ],
    'LAINNYA': [
        { name: 'lokasi_rak', label: 'Posisi Rak', type: 'text' },
        { name: 'is_pajak', label: 'Kena PPN?', type: 'checkbox' }
    ]
};

export const defaultCategoryTemplates = {
    'FNB_RESTO': ['MAKANAN UTAMA', 'MINUMAN', 'SNACK & DESSERT'],
    'FNB_PRODUKSI': ['BAHAN BAKU', 'BARANG SETENGAH JADI', 'PRODUK JADI'],
    'RETAIL_FASHION': ['ATASAN', 'BAWAHAN', 'AKSESORIS'],
    'DEFAULT': ['UMUM']
};