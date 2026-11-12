package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.AiMessage
import com.upstyle.bizgrow.data.AiSession
import com.upstyle.bizgrow.data.ChartOfAccount
import com.upstyle.bizgrow.data.TrxPreview
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import com.upstyle.bizgrow.ui.theme.LocalBizPalette
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.datetime.*

enum class AiTab(val label: String, val icon: ImageVector) {
    CHAT("Chat", Icons.Rounded.ChatBubbleOutline),
    ANALISIS("Analisis", Icons.Rounded.Insights),
    WA("Laporan WA", Icons.Rounded.Share)
}

/** Gradien khas Bizgrow AI — dipakai avatar, tombol bawah, dan kartu AI di Beranda. */
val GradAi: List<Color> get() = listOf(Color(0xFF6366F1), Color(0xFF8B5CF6), Color(0xFFEC4899))

@Composable
fun AiAvatar(size: androidx.compose.ui.unit.Dp = 40.dp, modifier: Modifier = Modifier) {
    Box(
        modifier.size(size).clip(RoundedCornerShape(size * 0.34f)).background(Brush.linearGradient(GradAi)),
        contentAlignment = Alignment.Center
    ) { Icon(Icons.Rounded.AutoAwesome, null, tint = Color.White, modifier = Modifier.size(size * 0.55f)) }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Data statis — sama dengan ChatAI.svelte
// ═══════════════════════════════════════════════════════════════════════════

private data class GrupPrompt(val judul: String, val warna: Color, val prompt: List<String>)

private val promptBisnis = listOf(
    GrupPrompt("💰 Keuangan & Akuntansi", Color(0xFF0EA5E9), listOf("Omzet hari ini?", "Analisis cash flow", "Cek piutang overdue", "Cek hutang jatuh tempo", "Laba rugi bulan ini", "Status tutup buku", "Saldo kas & bank")),
    GrupPrompt("🛒 Kasir & POS", Color(0xFF8B5CF6), listOf("Total penjualan kasir hari ini", "Jam transaksi paling ramai", "Metode bayar terpopuler", "Order kasir terakhir")),
    GrupPrompt("📦 Stok & Inventori", Color(0xFF10B981), listOf("Produk stok menipis", "Analisis dead stock", "Barang yang harus direstock", "Status PO pending", "Riwayat opname gudang")),
    GrupPrompt("👥 HR & Payroll", Color(0xFFF43F5E), listOf("Siapa yang absen hari ini?", "Cuti pending approval", "KPI karyawan terbaik", "Karyawan kontrak mau habis", "Rincian komponen gaji")),
    GrupPrompt("🤝 CRM & Pelanggan", Color(0xFFF59E0B), listOf("Deals CRM terbesar", "Pelanggan perlu follow up", "Pipeline yang stagnan", "Aktivitas CRM terakhir")),
    GrupPrompt("🏗️ Aset & Pajak", Color(0xFF64748B), listOf("Total nilai aset tetap", "Penyusutan terbesar", "Tarif pajak aktif", "Anggaran over-budget?"))
)
private val promptSales = listOf(
    GrupPrompt("💼 Pipeline & Deal", Color(0xFF8B5CF6), listOf("Deals terbesar yang open?", "Pipeline yang stagnan?", "Berapa deal closing bulan ini?", "Quotation yang sudah dikirim?")),
    GrupPrompt("📣 Pemasaran & Leads", Color(0xFFF43F5E), listOf("Kampanye iklan aktif?", "Berapa leads dari landing page?", "ROAS iklan Meta vs Google?", "Voucher yang paling banyak dipakai?")),
    GrupPrompt("🎧 Customer Service", Color(0xFF0EA5E9), listOf("Tiket urgent yang belum selesai?", "Berapa tiket open saat ini?", "Pelanggan yang sering komplain?")),
    GrupPrompt("🛍️ Toko Online", Color(0xFFF59E0B), listOf("Order online yang belum dibayar?", "Revenue toko online bulan ini?", "Produk terlaris di toko online?"))
)
private val promptBantuan = listOf(
    GrupPrompt("🗺️ Navigasi Fitur", Color(0xFF0EA5E9), listOf("Di mana input transaksi?", "Cara buat invoice piutang?", "Di mana tambah karyawan?", "Di mana lihat laporan keuangan?", "Cara setup COA akuntansi?", "Cara atur hak akses staff?")),
    GrupPrompt("⚙️ Pengaturan & Integrasi", Color(0xFF8B5CF6), listOf("Cara setup WhatsApp?", "Di mana seting kasir POS?", "Cara integrasi payment gateway?", "Di mana kelola produk?", "Cara tambah unit bisnis baru?")),
    GrupPrompt("📤 Export & Cetak", Color(0xFF10B981), listOf("Cara export laporan ke PDF?", "Cara export data ke Excel?", "Di mana cetak slip gaji?", "Cara kirim laporan via WhatsApp?")),
    GrupPrompt("🔐 Akun & Keamanan", Color(0xFFF43F5E), listOf("Cara ganti password?", "Di mana kelola staff portal?", "Cara setting role karyawan?")),
    GrupPrompt("💼 Penjualan & Marketing", Color(0xFF8B5CF6), listOf("Cara buat pipeline deals?", "Cara buat quotation?", "Cara buat kampanye marketing?", "Cara buat voucher diskon?", "Cara buat landing page?")),
    GrupPrompt("🎧 CS & Toko Online", Color(0xFFF59E0B), listOf("Cara buat tiket support?", "Cara setup toko online?", "Cara tambah integrasi Midtrans?", "Cara aktifkan landing page?")),
    GrupPrompt("🎓 Panduan Lengkap Step-by-Step", Color(0xFFF59E0B), listOf("Panduan mulai pakai Bizgrow dari nol", "Cara setup unit bisnis pertama kali", "Langkah input transaksi harian", "Cara kelola stok produk lengkap", "Panduan buat laporan keuangan"))
)
private val promptTips = listOf(
    GrupPrompt("🚀 Produktivitas", Color(0xFF0EA5E9), listOf("Tips mempercepat input transaksi", "Cara optimasi cashflow UMKM", "Strategi manajemen stok efisien", "Cara tingkatkan closing rate CRM")),
    GrupPrompt("📈 Analisis Bisnis", Color(0xFF10B981), listOf("Cara baca laporan laba rugi", "Apa itu gross margin?", "Indikator bisnis penting UMKM", "Cara proyeksi revenue")),
    GrupPrompt("🧾 Akuntansi Dasar", Color(0xFFF59E0B), listOf("Perbedaan piutang dan hutang?", "Cara kerja double-entry?", "Apa itu chart of accounts?", "Kapan harus tutup buku?")),
    GrupPrompt("🧠 Memori AI", Color(0xFF8B5CF6), listOf("Apa saja yang kamu ingat?", "Ingat nama panggilan saya...", "Toko kami libur hari..."))
)

private data class AksiAi(val label: String, val desk: String, val icon: ImageVector, val warna: Color, val target: Screen)

private val aksiCepatAi = listOf(
    AksiAi("Input Transaksi", "Catat pemasukan atau pengeluaran", Icons.Rounded.EditNote, Color(0xFF6366F1), Screen.TransactionEntry),
    AksiAi("Tambah Produk", "Daftarkan produk baru ke katalog", Icons.Rounded.Inventory2, Color(0xFF10B981), Screen.Products),
    AksiAi("Tambah Piutang", "Catat tagihan ke pelanggan", Icons.Rounded.RequestQuote, Color(0xFFF59E0B), Screen.Piutang),
    AksiAi("Tambah Hutang", "Catat tagihan dari supplier", Icons.Rounded.Payments, Color(0xFFF43F5E), Screen.Hutang),
    AksiAi("Tambah Karyawan", "Daftarkan karyawan baru ke HR", Icons.Rounded.Badge, Color(0xFF8B5CF6), Screen.Hr),
    AksiAi("Input Jurnal Umum", "Buat entri jurnal akuntansi", Icons.Rounded.MenuBook, Color(0xFF0EA5E9), Screen.JurnalUmum)
)

private fun jam(ts: Long): String {
    val d = Instant.fromEpochMilliseconds(ts).toLocalDateTime(TimeZone.currentSystemDefault())
    return "${d.hour.toString().padStart(2, '0')}:${d.minute.toString().padStart(2, '0')}"
}

private fun tglSesi(ts: Long): String {
    val d = Instant.fromEpochMilliseconds(ts).toLocalDateTime(TimeZone.currentSystemDefault())
    return "${d.dayOfMonth} ${namaBulanPendek(d.monthNumber)} ${jam(ts)}"
}

// ═══════════════════════════════════════════════════════════════════════════
//  Layar utama
// ═══════════════════════════════════════════════════════════════════════════

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiChatScreen(viewModel: AppViewModel) {
    val ai = viewModel.ai
    LaunchedEffect(Unit) { ai.muat() }

    val pesan by ai.pesan.collectAsState()
    val saran by ai.saran.collectAsState()
    val memuat by ai.memuat.collectAsState()
    val mengetikId by ai.mengetikId.collectAsState()
    val instan by ai.instan.collectAsState()
    val sesi by ai.sesi.collectAsState()
    val sesiAktif by ai.sesiAktifId.collectAsState()
    val menungguUnit by ai.menungguUnit.collectAsState()
    val unitDipilih by ai.unitDipilihId.collectAsState()
    val units by viewModel.units.collectAsState()
    val activeUnit by viewModel.activeUnit.collectAsState()
    val coa by ai.coa.collectAsState()
    val menyimpan by ai.menyimpan.collectAsState()

    var tab by remember { mutableStateOf(AiTab.CHAT) }
    var input by remember { mutableStateOf("") }
    var sheetRiwayat by remember { mutableStateOf(false) }
    var sheetUnit by remember { mutableStateOf(false) }
    var sheetAksi by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf(false) }
    var detail by remember { mutableStateOf<AiMessage?>(null) }
    var konfirmasiHapusSemua by remember { mutableStateOf(false) }

    val unitKonteks = ai.unitKonteks()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val uriHandler = LocalUriHandler.current

    // Gulir ke bawah saat ada pesan baru / indikator mengetik muncul
    val jumlahItem = pesan.size + (if (memuat) 1 else 0) + (if (pesan.isEmpty()) 1 else 0)
    LaunchedEffect(pesan.size, memuat) {
        if (jumlahItem > 0) listState.animateScrollToItem(jumlahItem - 1)
    }
    // Selama jawaban "diketik", ikuti ujung teks bila pengguna memang di bawah
    LaunchedEffect(mengetikId) {
        while (mengetikId != null) {
            if (!listState.canScrollForward || listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index == jumlahItem - 1) {
                listState.scrollBy(2000f)
            }
            delay(150)
        }
    }
    val tampilTombolBawah by remember { derivedStateOf { listState.canScrollForward && pesan.isNotEmpty() } }

    fun kirim(teks: String) { input = ""; tab = AiTab.CHAT; ai.kirim(teks) }

    fun bukaTautan(url: String) {
        val layar = layarDariTautan(url)
        when {
            layar != null -> viewModel.navigate(layar)
            url.startsWith("http") -> try { uriHandler.openUri(url) } catch (_: Exception) {}
            else -> viewModel.showError("Halaman ini tersedia di versi web Bizgrow")
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            Column(Modifier.background(MaterialTheme.colorScheme.background).statusBarsPadding()) {
                Row(Modifier.fillMaxWidth().padding(start = 6.dp, end = 4.dp, top = 6.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Kembali", tint = MaterialTheme.colorScheme.onBackground)
                    }
                    AiAvatar(38.dp)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Bizgrow AI", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(7.dp).clip(CircleShape).background(BizgrowColors.Success))
                            Spacer(Modifier.width(5.dp))
                            Text(if (memuat) "Sedang menjawab…" else "Asisten semua hal bisnismu", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                        }
                    }
                    BizIconButton(Icons.Rounded.History, "Riwayat chat") { sheetRiwayat = true }
                    Spacer(Modifier.width(6.dp))
                    BizIconButton(Icons.Rounded.AddComment, "Chat baru") { tab = AiTab.CHAT; ai.sesiBaru() }
                    Spacer(Modifier.width(6.dp))
                    Box {
                        BizIconButton(Icons.Rounded.MoreVert, "Menu") { menu = true }
                        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                            DropdownMenuItem(
                                text = { Column { Text("Jawaban instan"); Text(if (instan) "Aktif — langsung tampil" else "Mati — efek mengetik", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) } },
                                leadingIcon = { Icon(Icons.Rounded.FlashOn, null) },
                                trailingIcon = { Switch(checked = instan, onCheckedChange = { ai.setInstan(it) }) },
                                onClick = { ai.setInstan(!instan) }
                            )
                            DropdownMenuItem(text = { Text("Bersihkan percakapan ini") }, leadingIcon = { Icon(Icons.Rounded.CleaningServices, null) }, onClick = { menu = false; ai.bersihkan() })
                            DropdownMenuItem(
                                text = { Text("Hapus semua riwayat", color = BizgrowColors.Danger) },
                                leadingIcon = { Icon(Icons.Rounded.DeleteSweep, null, tint = BizgrowColors.Danger) },
                                onClick = { menu = false; konfirmasiHapusSemua = true }
                            )
                        }
                    }
                    Spacer(Modifier.width(6.dp))
                }
                // Tab mode + pil unit
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    AiTab.entries.forEach { t -> FilterPill(t.label, tab == t, { tab = t }) }
                    if (units.isNotEmpty()) {
                        Row(
                            Modifier.clip(RoundedCornerShape(50)).background(BizgrowColors.Primary.copy(alpha = 0.10f))
                                .pressClick { sheetUnit = true }.padding(start = 10.dp, end = 8.dp, top = 7.dp, bottom = 7.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Rounded.Storefront, null, tint = BizgrowColors.Primary, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(5.dp))
                            Text(unitKonteks?.name ?: "Pilih unit", style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Primary, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 150.dp))
                            Icon(Icons.Rounded.UnfoldMore, null, tint = BizgrowColors.Primary, modifier = Modifier.size(14.dp))
                        }
                    }
                }
                HorizontalDivider(color = LocalBizPalette.current.border)
            }
        },
        bottomBar = {
            if (tab == AiTab.CHAT) {
                Column(Modifier.background(MaterialTheme.colorScheme.background).navigationBarsPadding().imePadding()) {
                    AnimatedVisibility(saran.isNotEmpty() && !memuat, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
                        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            saran.forEach { s ->
                                Text(
                                    s, style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Primary, fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.clip(RoundedCornerShape(50)).background(BizgrowColors.Primary.copy(alpha = 0.10f))
                                        .border(1.dp, BizgrowColors.Primary.copy(alpha = 0.25f), RoundedCornerShape(50))
                                        .pressClick { kirim(s) }.padding(horizontal = 12.dp, vertical = 7.dp)
                                )
                            }
                        }
                    }
                    InputBarAi(
                        nilai = input, onUbah = { input = it }, memuat = memuat,
                        onAksi = { sheetAksi = true }, onKirim = { kirim(input) }
                    )
                }
            }
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (tab) {
                AiTab.CHAT -> {
                    LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        if (pesan.isEmpty()) {
                            item(key = "welcome") { Sambutan(unitKonteks?.name, onPrompt = { kirim(it) }, onAksi = { viewModel.navigate(it.target) }) }
                        }
                        items(pesan, key = { it.id }) { m ->
                            if (m.role == "user") GelembungUser(m)
                            else GelembungAi(
                                m = m,
                                mengetik = mengetikId == m.id,
                                onSelesaiMengetik = { ai.selesaiMengetik() },
                                onTautan = ::bukaTautan,
                                onDetail = { detail = m },
                                onUlang = { ai.ulangiTerakhir() },
                                kas = ai.akunKas(), coa = coa, lawan = { ai.akunLawan(it) },
                                menyimpan = menyimpan,
                                onSimpan = { idx, kas, c -> ai.simpanTransaksi(m.id, idx, kas, c) }
                            )
                        }
                        if (memuat) item(key = "mengetik") { IndikatorMengetik() }
                    }
                    androidx.compose.animation.AnimatedVisibility(
                        tampilTombolBawah, Modifier.align(Alignment.BottomEnd).padding(14.dp),
                        enter = fadeIn() + scaleIn(), exit = fadeOut() + scaleOut()
                    ) {
                        Box(
                            Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface)
                                .border(1.dp, LocalBizPalette.current.border, CircleShape)
                                .pressClick { scope.launch { listState.animateScrollToItem(jumlahItem - 1) } },
                            contentAlignment = Alignment.Center
                        ) { Icon(Icons.Rounded.KeyboardArrowDown, "Ke bawah", tint = MaterialTheme.colorScheme.onSurface) }
                    }
                }
                AiTab.ANALISIS -> FinancialAdvisorTab(viewModel)
                AiTab.WA -> WaReportTab(viewModel)
            }
        }
    }

    // ── Sheet: pilih unit (juga dipakai saat pertanyaan menunggu konteks unit) ──
    if (sheetUnit || menungguUnit != null) {
        ModalBottomSheet(
            onDismissRequest = { sheetUnit = false; ai.batalPilihUnit() },
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
                Text(if (menungguUnit != null) "Pertanyaan ini tentang unit mana?" else "Konteks unit bisnis", style = MaterialTheme.typography.titleLarge)
                Text(
                    if (menungguUnit != null) "“${menungguUnit}” — pilih unit supaya jawabannya memakai data yang tepat."
                    else "AI menjawab memakai data unit yang dipilih. Pertanyaan umum (cara pakai fitur) tidak butuh unit.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(14.dp))
                units.forEachIndexed { i, u ->
                    val dipilih = u.id == (unitKonteks?.id ?: -1)
                    BizSurface(
                        Modifier.fillMaxWidth().padding(bottom = 8.dp).enterAnimation(i),
                        onClick = { sheetUnit = false; ai.pilihUnit(u.id) },
                        contentPadding = PaddingValues(12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconBadge(kategoriDari(u.type).icon, kategoriDari(u.type).tint, size = 38.dp, iconSize = 20.dp)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(u.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                Text(kategoriDari(u.type).label + if (u.id == activeUnit?.id) " • unit aktif" else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (dipilih) Icon(Icons.Rounded.CheckCircle, null, tint = BizgrowColors.Primary)
                        }
                    }
                }
            }
        }
    }

    // ── Sheet: aksi cepat ──
    if (sheetAksi) {
        ModalBottomSheet(onDismissRequest = { sheetAksi = false }, containerColor = MaterialTheme.colorScheme.surface) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
                Text("Aksi Cepat", style = MaterialTheme.typography.titleLarge)
                Text("Langsung input tanpa perlu mengetik ke AI", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(14.dp))
                aksiCepatAi.forEachIndexed { i, a ->
                    ListRow(a.label, Modifier.enterAnimation(i), subtitle = a.desk, icon = a.icon, tint = a.warna, showChevron = true, onClick = { sheetAksi = false; viewModel.navigate(a.target) })
                }
            }
        }
    }

    // ── Sheet: riwayat sesi ──
    if (sheetRiwayat) {
        ModalBottomSheet(onDismissRequest = { sheetRiwayat = false }, containerColor = MaterialTheme.colorScheme.surface) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Riwayat Chat", style = MaterialTheme.typography.titleLarge)
                        Text("Tersimpan di perangkat • otomatis dihapus setelah 30 hari", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    BizButton("Baru", onClick = { sheetRiwayat = false; tab = AiTab.CHAT; ai.sesiBaru() }, icon = Icons.Rounded.Add, height = 42.dp, modifier = Modifier.width(110.dp))
                }
                Spacer(Modifier.height(12.dp))
                if (sesi.isEmpty()) {
                    EmptyView("Belum ada riwayat", "Percakapan yang kamu mulai akan tersimpan di sini.", Icons.Rounded.History)
                } else {
                    Column(Modifier.heightIn(max = 460.dp).verticalScrollKolom(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        sesi.forEach { s -> BarisSesi(s, aktif = s.id == sesiAktif, onBuka = { sheetRiwayat = false; tab = AiTab.CHAT; ai.bukaSesi(s.id) }, onHapus = { ai.hapusSesi(s.id) }) }
                    }
                }
            }
        }
    }

    // ── Sheet: detail jawaban ──
    detail?.let { m ->
        ModalBottomSheet(onDismissRequest = { detail = null }, containerColor = MaterialTheme.colorScheme.surface, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp).verticalScrollKolom()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AiAvatar(30.dp); Spacer(Modifier.width(10.dp))
                    Text("Detail jawaban AI", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Text(jam(m.ts), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.height(12.dp))
                AiRichText(m.content, onTautan = { detail = null; bukaTautan(it) })
                m.chartJson?.let { Spacer(Modifier.height(10.dp)); GrafikAi(it) }
            }
        }
    }

    if (konfirmasiHapusSemua) {
        AlertDialog(
            onDismissRequest = { konfirmasiHapusSemua = false },
            shape = RoundedCornerShape(24.dp),
            icon = { IconBadge(Icons.Rounded.DeleteSweep, BizgrowColors.Danger) },
            title = { Text("Hapus semua riwayat?") },
            text = { Text("Seluruh percakapan AI di perangkat ini akan dihapus dan tidak bisa dikembalikan.") },
            confirmButton = { TextButton(onClick = { konfirmasiHapusSemua = false; ai.hapusSemuaSesi() }) { Text("Hapus", color = BizgrowColors.Danger, fontWeight = FontWeight.Bold) } },
            dismissButton = { TextButton(onClick = { konfirmasiHapusSemua = false }) { Text("Batal") } }
        )
    }
}

@Composable
private fun Modifier.verticalScrollKolom(): Modifier = this.then(Modifier.verticalScroll(rememberScrollState()))

// ═══════════════════════════════════════════════════════════════════════════
//  Sambutan (tab prompt + aksi cepat)
// ═══════════════════════════════════════════════════════════════════════════

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Sambutan(namaUnit: String?, onPrompt: (String) -> Unit, onAksi: (AksiAi) -> Unit) {
    var tab by remember { mutableIntStateOf(0) }
    val tabs = listOf("📊 Bisnis", "💼 Penjualan", "🛠️ Cara Pakai", "💡 Tips")
    val grup = when (tab) { 0 -> promptBisnis; 1 -> promptSales; 2 -> promptBantuan; else -> promptTips }

    Column(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.enterAnimation(0)) {
            AiAvatar(52.dp)
            Spacer(Modifier.width(12.dp))
            Column {
                Text("Halo! Saya Bizgrow AI ✨", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(
                    "Tanya soal keuangan, stok, HR, CRM, atau cara pakai fitur ERP. Saya juga bisa mencatat transaksi dari kalimat biasa.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Contoh pencatatan cepat
        BizSurface(Modifier.fillMaxWidth().padding(top = 14.dp).enterAnimation(1), contentPadding = PaddingValues(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconBadge(Icons.Rounded.Bolt, BizgrowColors.Warning, size = 34.dp, iconSize = 18.dp)
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text("Catat transaksi lewat chat", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    Text("Ketik: “jual kopi 25rb tunai” atau “bayar listrik 450000”", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        Spacer(Modifier.height(14.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(LocalBizPalette.current.surfaceVariant).padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            tabs.forEachIndexed { i, t ->
                val aktif = tab == i
                Text(
                    t, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, maxLines = 1,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    color = if (aktif) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f).clip(RoundedCornerShape(10.dp))
                        .background(if (aktif) MaterialTheme.colorScheme.surface else Color.Transparent)
                        .pressClick { tab = i }.padding(vertical = 8.dp)
                )
            }
        }

        if (tab == 2) {
            Row(Modifier.fillMaxWidth().padding(top = 10.dp).clip(RoundedCornerShape(12.dp)).background(BizgrowColors.Info.copy(alpha = 0.10f)).padding(10.dp)) {
                Icon(Icons.Rounded.Info, null, tint = BizgrowColors.Info, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    "Panduan cara pakai tidak memerlukan pilih unit bisnis. AI memandu kamu langkah demi langkah" +
                        (namaUnit?.let { " dan tautannya mengarah ke $it." } ?: "."),
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        grup.forEach { g ->
            Text(g.judul, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 14.dp, bottom = 6.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                g.prompt.forEach { p ->
                    Text(
                        p, style = MaterialTheme.typography.labelMedium, color = g.warna, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(g.warna.copy(alpha = 0.10f))
                            .border(1.dp, g.warna.copy(alpha = 0.25f), RoundedCornerShape(50))
                            .pressClick { onPrompt(p) }.padding(horizontal = 12.dp, vertical = 7.dp)
                    )
                }
            }
        }

        Text("⚡ Aksi Cepat", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 18.dp, bottom = 6.dp))
        aksiCepatAi.chunked(2).forEach { baris ->
            Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                baris.forEach { a ->
                    BizSurface(Modifier.weight(1f), onClick = { onAksi(a) }, contentPadding = PaddingValues(12.dp)) {
                        IconBadge(a.icon, a.warna, size = 32.dp, iconSize = 17.dp)
                        Spacer(Modifier.height(8.dp))
                        Text(a.label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, maxLines = 1)
                        Text(a.desk, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Gelembung chat
// ═══════════════════════════════════════════════════════════════════════════

@Composable
private fun GelembungUser(m: AiMessage) {
    Column(Modifier.fillMaxWidth().enterAnimation(0), horizontalAlignment = Alignment.End) {
        if (!m.unitName.isNullOrBlank()) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 3.dp, end = 4.dp)) {
                Box(Modifier.size(5.dp).clip(CircleShape).background(BizgrowColors.Primary))
                Spacer(Modifier.width(5.dp))
                Text(m.unitName, style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Primary, fontWeight = FontWeight.SemiBold)
            }
        }
        Text(
            m.content, style = MaterialTheme.typography.bodyMedium, color = Color.White,
            modifier = Modifier.widthIn(max = 300.dp)
                .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp, bottomStart = 18.dp, bottomEnd = 4.dp))
                .background(Brush.linearGradient(listOf(BizgrowColors.Primary, BizgrowColors.Violet)))
                .padding(horizontal = 14.dp, vertical = 10.dp)
        )
        Text(jam(m.ts), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp, end = 4.dp))
    }
}

@Composable
private fun GelembungAi(
    m: AiMessage,
    mengetik: Boolean,
    onSelesaiMengetik: () -> Unit,
    onTautan: (String) -> Unit,
    onDetail: () -> Unit,
    onUlang: () -> Unit,
    kas: List<ChartOfAccount>,
    coa: List<ChartOfAccount>,
    lawan: (String) -> List<ChartOfAccount>,
    menyimpan: Set<String>,
    onSimpan: (Int, Int, Int) -> Unit
) {
    val clipboard = LocalClipboardManager.current
    var disalin by remember { mutableStateOf(false) }
    // Efek mengetik: tampilkan teks bertahap; sentuh gelembung untuk langsung selesai
    var tampilN by remember(m.id) { mutableIntStateOf(if (mengetik) 0 else m.content.length) }
    LaunchedEffect(m.id, mengetik) {
        if (mengetik) {
            while (tampilN < m.content.length) { tampilN = minOf(m.content.length, tampilN + 7); delay(14) }
            onSelesaiMengetik()
        } else tampilN = m.content.length
    }
    LaunchedEffect(disalin) { if (disalin) { delay(1500); disalin = false } }
    val teks = if (tampilN >= m.content.length) m.content else m.content.take(tampilN)
    val selesai = tampilN >= m.content.length
    val panjang = m.content.length > 500 || m.chartJson != null

    Row(Modifier.fillMaxWidth().enterAnimation(0), verticalAlignment = Alignment.Top) {
        AiAvatar(28.dp, Modifier.padding(top = 2.dp))
        Spacer(Modifier.width(8.dp))
        Column(Modifier.weight(1f)) {
            Column(
                Modifier.clip(RoundedCornerShape(topStart = 4.dp, topEnd = 18.dp, bottomStart = 18.dp, bottomEnd = 18.dp))
                    .background(if (m.isError) BizgrowColors.Danger.copy(alpha = 0.10f) else MaterialTheme.colorScheme.surface)
                    .border(1.dp, if (m.isError) BizgrowColors.Danger.copy(alpha = 0.3f) else LocalBizPalette.current.border, RoundedCornerShape(topStart = 4.dp, topEnd = 18.dp, bottomStart = 18.dp, bottomEnd = 18.dp))
                    .then(if (!selesai) Modifier.clickable { tampilN = m.content.length } else Modifier)
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                AiRichText(teks, onTautan = onTautan)
                if (selesai) m.chartJson?.let { GrafikAi(it) }
                if (selesai) m.previews.forEachIndexed { i, p ->
                    KartuTransaksi(
                        p = p, tersimpan = i in m.tersimpan, sedangSimpan = "${m.id}-$i" in menyimpan,
                        kas = kas, lawan = lawan(p.kategori), akunSiap = coa.isNotEmpty(),
                        onSimpan = { k, c -> onSimpan(i, k, c) }
                    )
                }
            }
            if (selesai) {
                Row(Modifier.padding(top = 4.dp, start = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(jam(m.ts), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.width(6.dp))
                    AksiKecil(if (disalin) Icons.Rounded.Check else Icons.Rounded.ContentCopy, if (disalin) "Tersalin" else "Salin") {
                        clipboard.setText(AnnotatedString(m.content)); disalin = true
                    }
                    if (panjang) AksiKecil(Icons.Rounded.OpenInFull, "Detail", onDetail)
                    if (m.isError) AksiKecil(Icons.Rounded.Refresh, "Coba lagi", onUlang)
                }
            }
        }
    }
}

@Composable
private fun AksiKecil(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(
        Modifier.clip(RoundedCornerShape(50)).pressClick(onClick = onClick).padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
        Spacer(Modifier.width(4.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun IndikatorMengetik() {
    val t = rememberInfiniteTransition(label = "dots")
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        AiAvatar(28.dp)
        Spacer(Modifier.width(8.dp))
        Row(
            Modifier.clip(RoundedCornerShape(topStart = 4.dp, topEnd = 18.dp, bottomStart = 18.dp, bottomEnd = 18.dp))
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, LocalBizPalette.current.border, RoundedCornerShape(topStart = 4.dp, topEnd = 18.dp, bottomStart = 18.dp, bottomEnd = 18.dp))
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            repeat(3) { n ->
                val a by t.animateFloat(0.3f, 1f, infiniteRepeatable(tween(600, delayMillis = n * 160), RepeatMode.Reverse), label = "dot$n")
                Box(Modifier.size(7.dp).graphicsLayer { alpha = a; scaleX = 0.7f + a * 0.3f; scaleY = 0.7f + a * 0.3f }.clip(CircleShape).background(BizgrowColors.Primary))
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Kartu konfirmasi transaksi (hasil deteksi bahasa natural)
// ═══════════════════════════════════════════════════════════════════════════

@Composable
private fun KartuTransaksi(
    p: TrxPreview, tersimpan: Boolean, sedangSimpan: Boolean,
    kas: List<ChartOfAccount>, lawan: List<ChartOfAccount>, akunSiap: Boolean,
    onSimpan: (Int, Int) -> Unit
) {
    val masuk = p.kategori.equals("Masuk", true)
    val warna = if (masuk) BizgrowColors.Success else BizgrowColors.Danger
    // Akun saran server dipakai bila ada di daftar; dulu selalu akun pertama → transfer/QRIS tercatat ke kas tunai
    var kasId by remember(kas) { mutableStateOf(kas.firstOrNull { it.id == p.kasCoaId }?.id ?: kas.firstOrNull()?.id) }
    var coaId by remember(lawan) { mutableStateOf(lawan.firstOrNull { it.id == p.coaId }?.id ?: lawan.firstOrNull()?.id) }
    var galat by remember { mutableStateOf<String?>(null) }

    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(warna.copy(alpha = 0.08f))
            .border(1.dp, warna.copy(alpha = 0.3f), RoundedCornerShape(16.dp)).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(if (masuk) Icons.Rounded.SouthWest else Icons.Rounded.NorthEast, warna, size = 36.dp, iconSize = 18.dp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(p.keterangan.ifBlank { if (masuk) "Pemasukan" else "Pengeluaran" }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 2)
                Text(
                    listOfNotNull(p.tanggal, p.metode).joinToString(" • "),
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text((if (masuk) "+" else "-") + p.nominal.rupiah(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = warna)
        }
        if (tersimpan) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.CheckCircle, null, tint = BizgrowColors.Success, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Transaksi tersimpan", style = MaterialTheme.typography.labelLarge, color = BizgrowColors.Success, fontWeight = FontWeight.Bold)
            }
        } else if (!akunSiap) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
                Text("Memuat akun kas & COA…", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            PilihAkun("Akun kas / bank", kas, kasId) { kasId = it; galat = null }
            PilihAkun(if (masuk) "Akun pendapatan" else "Akun beban", lawan, coaId) { coaId = it; galat = null }
            galat?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Danger) }
            BizButton(
                if (sedangSimpan) "Menyimpan…" else "Simpan Transaksi",
                onClick = {
                    val k = kasId; val c = coaId
                    if (k == null || c == null) galat = "Pilih akun kas dan COA terlebih dahulu." else onSimpan(k, c)
                },
                enabled = !sedangSimpan, icon = Icons.Rounded.Save
            )
        }
    }
}

@Composable
private fun PilihAkun(label: String, daftar: List<ChartOfAccount>, dipilih: Int?, onPilih: (Int) -> Unit) {
    var buka by remember { mutableStateOf(false) }
    val aktif = daftar.firstOrNull { it.id == dipilih }
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 3.dp))
        Box {
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, LocalBizPalette.current.border, RoundedCornerShape(12.dp))
                    .clickable { buka = true }.padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(aktif?.let { "${it.kodeAkun} · ${it.namaAkun}" } ?: "Pilih akun", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis,
                    color = if (aktif == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
                Icon(Icons.Rounded.UnfoldMore, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
            }
            DropdownMenu(expanded = buka, onDismissRequest = { buka = false }, modifier = Modifier.heightIn(max = 320.dp)) {
                if (daftar.isEmpty()) DropdownMenuItem(text = { Text("Belum ada akun yang cocok") }, onClick = { buka = false })
                daftar.forEach { a ->
                    DropdownMenuItem(
                        text = { Text("${a.kodeAkun} · ${a.namaAkun}") },
                        trailingIcon = { if (a.id == dipilih) Icon(Icons.Rounded.Check, null, tint = BizgrowColors.Primary) },
                        onClick = { buka = false; onPilih(a.id) }
                    )
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Input & riwayat
// ═══════════════════════════════════════════════════════════════════════════

@Composable
private fun InputBarAi(nilai: String, onUbah: (String) -> Unit, memuat: Boolean, onAksi: () -> Unit, onKirim: () -> Unit) {
    val bisaKirim = nilai.isNotBlank() && !memuat
    val skala by animateFloatAsState(if (bisaKirim) 1f else 0.9f, tween(150), label = "kirim")
    Row(
        Modifier.fillMaxWidth().padding(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 10.dp),
        verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Box(
            Modifier.size(44.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface)
                .border(1.dp, LocalBizPalette.current.border, CircleShape).pressClick(onClick = onAksi),
            contentAlignment = Alignment.Center
        ) { Icon(Icons.Rounded.Bolt, "Aksi cepat", tint = BizgrowColors.Warning) }
        OutlinedTextField(
            value = nilai, onValueChange = onUbah,
            modifier = Modifier.weight(1f),
            placeholder = { Text("Tanya apa saja… atau catat transaksi", style = MaterialTheme.typography.bodyMedium) },
            shape = RoundedCornerShape(24.dp),
            maxLines = 4,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
            keyboardActions = KeyboardActions(onSend = { if (bisaKirim) onKirim() }),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = BizgrowColors.Primary,
                unfocusedBorderColor = LocalBizPalette.current.border,
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface
            )
        )
        Box(
            Modifier.size(48.dp).graphicsLayer { scaleX = skala; scaleY = skala }.clip(CircleShape)
                .background(if (bisaKirim) Brush.linearGradient(GradAi) else Brush.linearGradient(listOf(LocalBizPalette.current.border, LocalBizPalette.current.border)))
                .pressClick(enabled = bisaKirim, onClick = onKirim),
            contentAlignment = Alignment.Center
        ) {
            if (memuat) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            else Icon(Icons.AutoMirrored.Rounded.Send, "Kirim", tint = if (bisaKirim) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun BarisSesi(s: AiSession, aktif: Boolean, onBuka: () -> Unit, onHapus: () -> Unit) {
    val terakhir = s.messages.lastOrNull { it.role == "assistant" }?.content?.replace(Regex("[*#|`>:]"), "")?.trim().orEmpty()
    val hampirKedaluwarsa = Clock.System.now().toEpochMilliseconds() - s.createdAt > 27L * 86400000
    BizSurface(
        Modifier.fillMaxWidth(),
        color = if (aktif) BizgrowColors.Primary.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface,
        onClick = onBuka, contentPadding = PaddingValues(start = 14.dp, top = 10.dp, bottom = 10.dp, end = 4.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(s.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    color = if (aktif) BizgrowColors.Primary else MaterialTheme.colorScheme.onSurface)
                Text(
                    "${tglSesi(s.updatedAt)} • ${s.messages.size} pesan" + if (hampirKedaluwarsa) " • segera kedaluwarsa" else "",
                    style = MaterialTheme.typography.labelSmall, color = if (hampirKedaluwarsa) BizgrowColors.Warning else MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (terakhir.isNotBlank()) Text(terakhir, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            IconButton(onClick = onHapus) { Icon(Icons.Rounded.DeleteOutline, "Hapus sesi", tint = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Kartu AI di Beranda — pintu masuk utama ke asisten
// ═══════════════════════════════════════════════════════════════════════════

@Composable
fun KartuAiBeranda(viewModel: AppViewModel, modifier: Modifier = Modifier) {
    val saranCepat = listOf("Omzet hari ini?", "Produk stok menipis", "Cek piutang overdue", "Laba rugi bulan ini", "Cara input transaksi?", "Siapa yang absen hari ini?")
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(GradAi))
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = 0.22f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.AutoAwesome, null, tint = Color.White, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Bizgrow AI", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White)
                Text("Asisten untuk semua hal bisnismu", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.85f))
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White.copy(alpha = 0.95f))
                .pressClick(pressedScale = 0.985f) { viewModel.tanyaAi() }.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Tanya apa saja… “omzet hari ini?”", style = MaterialTheme.typography.bodyMedium, color = Color(0xFF64748B), modifier = Modifier.weight(1f), maxLines = 1)
            Box(Modifier.size(30.dp).clip(CircleShape).background(Brush.linearGradient(GradAi)), contentAlignment = Alignment.Center) {
                Icon(Icons.AutoMirrored.Rounded.Send, null, tint = Color.White, modifier = Modifier.size(15.dp))
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            saranCepat.forEach { s ->
                Text(
                    s, style = MaterialTheme.typography.labelMedium, color = Color.White, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = 0.20f))
                        .pressClick { viewModel.tanyaAi(s) }.padding(horizontal = 12.dp, vertical = 7.dp)
                )
            }
        }
    }
}
