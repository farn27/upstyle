/** @param {string} slug */
export function buildNavItems(slug = '') {
	const s = slug || '{slug}';
	const unit = (p) => (slug ? p.replace('{slug}', slug) : p.replace('/{slug}', ''));

	return [
		{
			name: 'Dashboard Unit',
			desc: 'Analisis profit, omzet, dan forecast bisnis',
			path: unit(`/finance/{slug}`),
			cat: 'Modul Utama',
			iconKey: 'dashboard',
			subItems: []
		},
		{
			name: 'Katalog Produk',
			desc: 'Manajemen item barang dan stok',
			path: unit(`/finance/{slug}/produk`),
			cat: 'Modul Utama',
			iconKey: 'package',
			subItems: [
				{ name: 'Daftar Produk', path: unit(`/finance/{slug}/produk`) },
				{ name: 'Kategori', path: unit(`/finance/{slug}/produk/kategori`) }
			]
		},
		{
			name: 'POS (Point of Sales)',
			desc: 'Mencatat transaksi penjualan ritel & grosir',
			path: unit(`/finance/{slug}/pos`),
			cat: 'Modul Utama',
			iconKey: 'cart',
			subItems: [
				{ name: 'Kasir Penjualan', path: unit(`/finance/{slug}/pos`) }
			]
		},
		{
			name: 'SDM / HR Staff',
			desc: 'Kelola absensi, data staff, dan payroll',
			path: unit(`/finance/{slug}/hr`),
			cat: 'Modul Utama',
			iconKey: 'users',
			subItems: [
				{ name: 'Daftar Staff', path: unit(`/finance/{slug}/hr`) }
			]
		},
		{
			name: 'CRM',
			desc: 'Kontak, pipeline, dan aktivitas pelanggan',
			path: unit(`/finance/{slug}/crm`),
			cat: 'Modul Utama',
			iconKey: 'crm',
			subItems: [
				{ name: 'Dashboard CRM', path: unit(`/finance/{slug}/crm`) },
				{ name: 'Kontak', path: unit(`/finance/{slug}/crm/kontak`) },
				{ name: 'Pipeline', path: unit(`/finance/{slug}/crm/pipeline`) }
			]
		},
		{
			name: 'Master Data',
			desc: 'Pusat data dasar modul akuntansi',
			path: unit(`/finance/{slug}/master-data`),
			cat: 'Akuntansi & Keuangan',
			iconKey: 'database',
			subItems: [
				{ name: 'Bagan Akun (COA)', path: unit(`/finance/{slug}/master-data/coa`) },
				{ name: 'Aset Tetap', path: unit(`/finance/{slug}/master-data/aset`) },
				{ name: 'Kontak Supplier/Customer', path: unit(`/finance/{slug}/master-data/kontak`) },
				{ name: 'Pajak & Budgeting', path: unit(`/finance/{slug}/master-data/pajak`) },
				{ name: 'Tutup Buku', path: unit(`/finance/{slug}/master-data/tutup-buku`) }
			]
		},
		{
			name: 'Jurnal Umum',
			desc: 'Pencatatan entry jurnal manual harian',
			path: unit(`/finance/{slug}/jurnal-umum`),
			cat: 'Akuntansi & Keuangan',
			iconKey: 'journal',
			subItems: []
		},
		{
			name: 'Buku Besar',
			desc: 'Detail mutasi per akun perkiraan',
			path: unit(`/finance/{slug}/buku-besar`),
			cat: 'Akuntansi & Keuangan',
			iconKey: 'ledger',
			subItems: []
		},
		{
			name: 'Piutang (AR)',
			desc: 'Tagihan ke customer & penagihan',
			path: unit(`/finance/{slug}/piutang`),
			cat: 'Akuntansi & Keuangan',
			iconKey: 'receivable',
			subItems: [
				{ name: 'Invoice Penjualan', path: unit(`/finance/{slug}/piutang`) },
				{ name: 'Penerimaan Pembayaran', path: unit(`/finance/{slug}/piutang?focus=payment`) }
			]
		},
		{
			name: 'Hutang (AP)',
			desc: 'Tagihan dari vendor / supplier',
			path: unit(`/finance/{slug}/hutang`),
			cat: 'Akuntansi & Keuangan',
			iconKey: 'payable',
			subItems: [
				{ name: 'Tagihan Pembelian', path: unit(`/finance/{slug}/hutang`) },
				{ name: 'Pengeluaran Pembayaran', path: unit(`/finance/{slug}/hutang?focus=payment`) }
			]
		},
		{
			name: 'Pusat Laporan Keuangan',
			desc: 'Laporan Laba Rugi, Neraca, Arus Kas',
			path: unit(`/finance/{slug}/laporan`),
			cat: 'Akuntansi & Keuangan',
			iconKey: 'report',
			subItems: [
				{ name: 'Dashboard Analisis', path: unit(`/finance/{slug}/laporan`) },
				{ name: 'Laba Rugi', path: unit(`/finance/{slug}/laporan?tab=labarugi`) },
				{ name: 'Neraca', path: unit(`/finance/{slug}/laporan?tab=neraca`) }
			]
		},
		{
			name: 'Penjualan B2B & Pipeline',
			desc: 'Sales pipeline, penawaran, dan target',
			path: unit(`/ecommerce/{slug}/sales`),
			cat: 'Penjualan & Pemasaran',
			iconKey: 'sales',
			subItems: [
				{ name: 'Dashboard Penjualan', path: unit(`/ecommerce/{slug}/sales`) },
				{ name: 'Pipeline B2B', path: unit(`/ecommerce/{slug}/sales/pipeline`) },
				{ name: 'Penawaran', path: unit(`/ecommerce/{slug}/sales/quotation`) },
				{ name: 'Sales Order', path: unit(`/ecommerce/{slug}/sales/order`) },
				{ name: 'Target & Komisi', path: unit(`/ecommerce/{slug}/sales/target`) }
			]
		},
		{
			name: 'Pemasaran & Kampanye',
			desc: 'Manajemen leads, campaign, dan diskon',
			path: unit(`/ecommerce/{slug}/marketing`),
			cat: 'Penjualan & Pemasaran',
			iconKey: 'marketing',
			subItems: [
				{ name: 'Marketing Dashboard', path: unit(`/ecommerce/{slug}/marketing`) },
				{ name: 'Kampanye & Iklan', path: unit(`/ecommerce/{slug}/marketing/campaign`) },
				{ name: 'Leads', path: unit(`/ecommerce/{slug}/marketing/leads`) },
				{ name: 'Voucher & Diskon', path: unit(`/ecommerce/{slug}/marketing/voucher`) }
			]
		},
		{
			name: 'Layanan Pelanggan (CS)',
			desc: 'Ticketing dan support channel',
			path: unit(`/ecommerce/{slug}/layanan`),
			cat: 'Layanan & E-Commerce',
			iconKey: 'support',
			subItems: [
				{ name: 'Support Dashboard', path: unit(`/ecommerce/{slug}/layanan`) },
				{ name: 'Ticketing System', path: unit(`/ecommerce/{slug}/layanan/tickets`) },
				{ name: 'Knowledge Base (FAQ)', path: unit(`/ecommerce/{slug}/layanan/knowledge-base`) }
			]
		},
		{
			name: 'E-Commerce Store',
			desc: 'Manajemen toko online dan katalog publik',
			path: unit(`/ecommerce/{slug}`),
			cat: 'Layanan & E-Commerce',
			iconKey: 'ecommerce',
			subItems: [
				{ name: 'Storefront Setting', path: unit(`/ecommerce/{slug}`) },
				{ name: 'Pesanan Online', path: unit(`/ecommerce/{slug}/orders`) },
				{ name: 'Katalog Publik', path: unit(`/ecommerce/{slug}/katalog`) },
				{ name: 'Integrasi Marketplace', path: unit(`/ecommerce/{slug}/integrasi`) },
				{ name: 'Landing Page', path: unit(`/ecommerce/{slug}/landing-page`) }
			]
		},
		{
			name: 'Pengaturan Unit',
			desc: 'Profil bisnis, portal karyawan, preferensi',
			path: slug ? unit(`/finance/{slug}/settings`) : '/settings',
			cat: 'Sistem',
			iconKey: 'settings',
			subItems: []
		},
		{ name: 'Bantuan & Panduan', desc: 'Dokumentasi dan panduan sistem', path: '/help', cat: 'Sistem', iconKey: 'help', subItems: [] },
		{ name: 'Daftar Unit Bisnis', desc: 'Kelola semua unit bisnis Anda', path: '/finance', cat: 'Sistem', iconKey: 'building', subItems: [] },
		{ name: 'Daftarkan Unit Baru', desc: 'Registrasi unit bisnis atau cabang baru', path: '/finance/create', cat: 'Sistem', iconKey: 'plus', subItems: [] },
		{
			name: 'Business Planning',
			desc: 'Rencanakan bisnis baru dari nol dengan AI wizard',
			path: '/finance/planning',
			cat: 'Sistem',
			iconKey: 'planning',
			subItems: [
				{ name: 'Daftar Rencana', path: '/finance/planning' },
				{ name: 'Buat Rencana Baru', path: '/finance/planning/wizard' }
			]
		}
	];
}

/** Flat list untuk QuickNav search */
export function flattenNavItems(slug = '') {
	return buildNavItems(slug).flatMap((item) => [
		item,
		...(item.subItems || []).map((sub) => ({
			name: sub.name,
			desc: item.desc,
			path: sub.path,
			cat: item.cat
		}))
	]);
}
