package com.upstyle.bizgrow.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material.icons.automirrored.rounded.Undo
import androidx.compose.material.icons.rounded.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector

/** Satu fitur/modul yang bisa dibuka dari hub "Semua Fitur". */
data class ModuleEntry(
    val label: String,
    val icon: ImageVector,
    val tint: Color,
    val screen: Screen,
    val keywords: String = ""
)

data class ModuleGroup(val title: String, val tint: Color, val modules: List<ModuleEntry>)

private val Indigo = Color(0xFF5048E5)
private val Emerald = Color(0xFF10B981)
private val Amber = Color(0xFFF59E0B)
private val Sky = Color(0xFF0EA5E9)
private val Rose = Color(0xFFF43F5E)
private val Violet = Color(0xFF8B5CF6)
private val Teal = Color(0xFF14B8A6)
private val Pink = Color(0xFFEC4899)
private val Slate = Color(0xFF64748B)

/** Katalog lengkap modul aplikasi, dikelompokkan per bidang usaha. */
val ModuleCatalog: List<ModuleGroup> = listOf(
    ModuleGroup(
        "Keuangan", Indigo, listOf(
            ModuleEntry("Keuangan", Icons.Rounded.AccountBalanceWallet, Indigo, Screen.Finance, "kas arus uang transaksi"),
            ModuleEntry("Catat Transaksi", Icons.Rounded.EditNote, Emerald, Screen.TransactionEntry, "pemasukan pengeluaran input"),
            ModuleEntry("Piutang", Icons.Rounded.RequestQuote, Violet, Screen.Piutang, "invoice tagihan pelanggan"),
            ModuleEntry("Hutang", Icons.Rounded.Payments, Rose, Screen.Hutang, "tagihan supplier bayar"),
            ModuleEntry("Jurnal Umum", Icons.AutoMirrored.Rounded.ReceiptLong, Sky, Screen.JurnalUmum, "akuntansi debit kredit"),
            ModuleEntry("Buku Besar", Icons.Rounded.MenuBook, Teal, Screen.BukuBesar, "ledger akun"),
            ModuleEntry("Laporan", Icons.Rounded.Assessment, Indigo, Screen.Laporan, "laba rugi arus kas"),
            ModuleEntry("Neraca", Icons.Rounded.Balance, Amber, Screen.Neraca, "aset liabilitas ekuitas"),
            ModuleEntry("Anggaran", Icons.Rounded.Savings, Emerald, Screen.Budget, "budget"),
            ModuleEntry("Aset Tetap", Icons.Rounded.Domain, Slate, Screen.FixedAssets, "penyusutan"),
            ModuleEntry("Akun (COA)", Icons.Rounded.AccountTree, Violet, Screen.Coa, "chart of account bagan akun"),
            ModuleEntry("Pajak", Icons.Rounded.Percent, Rose, Screen.TaxRates, "ppn pph tarif"),
            ModuleEntry("Tutup Buku", Icons.Rounded.LockClock, Slate, Screen.ClosingPeriod, "periode closing"),
            ModuleEntry("Laporan WA", Icons.Rounded.Forum, Emerald, Screen.LaporanWa, "whatsapp kirim ringkasan"),
        )
    ),
    ModuleGroup(
        "Penjualan & Kasir", Emerald, listOf(
            ModuleEntry("Kasir (POS)", Icons.Rounded.PointOfSale, Emerald, Screen.Pos, "jual checkout"),
            ModuleEntry("Antrean & Dapur", Icons.Rounded.SoupKitchen, Amber, Screen.PosQueue, "pesanan dapur meja kitchen"),
            ModuleEntry("Shift Kasir", Icons.Rounded.Schedule, Sky, Screen.PosShift, "buka tutup laci kas"),
            ModuleEntry("Retur Penjualan", Icons.AutoMirrored.Rounded.Undo, Rose, Screen.PosReturn, "refund kembali"),
            ModuleEntry("Voucher & Promo", Icons.Rounded.LocalOffer, Pink, Screen.PosVouchers, "diskon kupon"),
            ModuleEntry("Pesanan", Icons.Rounded.ShoppingBag, Indigo, Screen.Orders, "order online toko"),
            ModuleEntry("Penawaran", Icons.Rounded.Description, Violet, Screen.Quotations, "quotation"),
            ModuleEntry("Sales Order", Icons.Rounded.Assignment, Teal, Screen.SalesOrders, "so pesanan penjualan"),
            ModuleEntry("Target Sales", Icons.AutoMirrored.Rounded.TrendingUp, Amber, Screen.SalesTargets, "komisi target"),
        )
    ),
    ModuleGroup(
        "Produk & Stok", Amber, listOf(
            ModuleEntry("Produk", Icons.Rounded.Inventory2, Amber, Screen.Products, "barang item"),
            ModuleEntry("Pengadaan", Icons.Rounded.LocalShipping, Indigo, Screen.Scm, "supplier purchase order po pembelian"),
            ModuleEntry("Stok Opname", Icons.Rounded.FactCheck, Teal, Screen.StockOpname, "hitung stok"),
            ModuleEntry("Riwayat Stok", Icons.Rounded.History, Sky, Screen.StockLogs, "mutasi log"),
            ModuleEntry("Harga", Icons.Rounded.Sell, Emerald, Screen.Pricing, "harga jual margin"),
            ModuleEntry("Operasi Massal", Icons.Rounded.DynamicFeed, Violet, Screen.BulkOperations, "bulk update banyak"),
            ModuleEntry("Katalog", Icons.Rounded.Storefront, Pink, Screen.Katalog, "etalase"),
            ModuleEntry("Scan Barcode", Icons.Rounded.QrCodeScanner, Slate, Screen.BarcodeScanner, "qr kamera"),
            ModuleEntry("Sampah Produk", Icons.Rounded.DeleteOutline, Rose, Screen.TrashProducts, "arsip hapus pulihkan"),
        )
    ),
    ModuleGroup(
        "Pelanggan & Pemasaran", Pink, listOf(
            ModuleEntry("CRM", Icons.Rounded.Groups, Pink, Screen.Crm, "pelanggan relasi"),
            ModuleEntry("Kontak", Icons.Rounded.Contacts, Indigo, Screen.CrmContacts, "customer"),
            ModuleEntry("Pipeline", Icons.Rounded.ViewKanban, Violet, Screen.CrmPipeline, "deal prospek"),
            ModuleEntry("Aktivitas", Icons.Rounded.EventNote, Sky, Screen.CrmActivities, "telepon meeting"),
            ModuleEntry("Tugas", Icons.Rounded.TaskAlt, Emerald, Screen.CrmTasks, "to do"),
            ModuleEntry("Layanan CS", Icons.Rounded.SupportAgent, Teal, Screen.CsInbox, "tiket keluhan"),
            ModuleEntry("Marketing", Icons.Rounded.Campaign, Amber, Screen.Marketing, "lead iklan"),
            ModuleEntry("Kampanye", Icons.Rounded.Flag, Rose, Screen.MarketingCampaigns, "campaign"),
            ModuleEntry("Sosial Media", Icons.Rounded.Share, Pink, Screen.Sosmed, "instagram posting caption"),
            ModuleEntry("Landing Page", Icons.Rounded.Web, Indigo, Screen.LandingPageScreen, "halaman promo"),
            ModuleEntry("Website", Icons.Rounded.Language, Sky, Screen.WebsiteBuilder, "situs"),
        )
    ),
    ModuleGroup(
        "SDM", Sky, listOf(
            ModuleEntry("Karyawan", Icons.Rounded.Badge, Sky, Screen.Hr, "pegawai staff"),
            ModuleEntry("Absensi", Icons.Rounded.HowToReg, Emerald, Screen.Absensi, "presensi hadir"),
            ModuleEntry("Penggajian", Icons.Rounded.AccountBalance, Indigo, Screen.Payroll, "gaji payroll slip"),
            ModuleEntry("Cuti", Icons.Rounded.BeachAccess, Amber, Screen.LeaveRequests, "izin libur"),
            ModuleEntry("Persetujuan", Icons.Rounded.Approval, Violet, Screen.Approvals, "approval"),
            ModuleEntry("Departemen", Icons.Rounded.CorporateFare, Slate, Screen.Departments, "divisi"),
        )
    ),
    ModuleGroup(
        "AI & Perencanaan", Violet, listOf(
            ModuleEntry("Asisten AI", Icons.Rounded.AutoAwesome, Violet, Screen.AiChat, "chat tanya"),
            ModuleEntry("Rencana Bisnis", Icons.Rounded.Lightbulb, Amber, Screen.BusinessPlan, "business plan"),
        )
    ),
    ModuleGroup(
        "Akun & Sistem", Slate, listOf(
            ModuleEntry("Unit Bisnis", Icons.Rounded.Business, Indigo, Screen.Units, "cabang toko ganti"),
            ModuleEntry("Paket Langganan", Icons.Rounded.WorkspacePremium, Amber, Screen.SubscriptionPlans, "upgrade pro"),
            ModuleEntry("Riwayat Tagihan", Icons.AutoMirrored.Rounded.ReceiptLong, Emerald, Screen.InvoiceHistory, "invoice pembayaran langganan"),
            ModuleEntry("Pemakaian", Icons.Rounded.DataUsage, Sky, Screen.UsageMetrics, "kuota batas"),
            ModuleEntry("Ekspor / Impor", Icons.Rounded.ImportExport, Teal, Screen.ExportImport, "excel csv backup"),
            ModuleEntry("Sinkronisasi", Icons.Rounded.CloudSync, Violet, Screen.SyncStatus, "offline antrean"),
            ModuleEntry("Notifikasi", Icons.Rounded.Notifications, Rose, Screen.Notifications, "pemberitahuan"),
            ModuleEntry("Pengaturan", Icons.Rounded.Settings, Slate, Screen.Settings, "setting"),
            ModuleEntry("Bantuan", Icons.Rounded.HelpOutline, Sky, Screen.HelpCenter, "faq panduan"),
            ModuleEntry("Diagnostik", Icons.Rounded.MonitorHeart, Emerald, Screen.Diagnostics, "cek koneksi"),
        )
    ),
)
