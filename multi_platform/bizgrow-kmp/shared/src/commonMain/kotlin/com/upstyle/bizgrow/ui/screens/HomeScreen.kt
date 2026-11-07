package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.BusinessUnit
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import com.upstyle.bizgrow.ui.theme.LocalBizPalette
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/** Kategori usaha (kode sama dengan web: lib/businessCategories.js). */
data class KategoriUsaha(val kode: String, val label: String, val icon: ImageVector, val tint: Color)

val KategoriUsahaList = listOf(
    KategoriUsaha("FNB_RESTO", "Restoran", Icons.Rounded.Restaurant, Color(0xFFF97316)),
    KategoriUsaha("FNB_COFFEE_ROASTERY", "Kafe / Kopi", Icons.Rounded.LocalCafe, Color(0xFF92400E)),
    KategoriUsaha("FNB_CATERING", "Katering", Icons.Rounded.RoomService, Color(0xFFEAB308)),
    KategoriUsaha("RETAIL_MINIMARKET", "Toko / Minimarket", Icons.Rounded.Storefront, Color(0xFF10B981)),
    KategoriUsaha("RETAIL_FASHION", "Fashion", Icons.Rounded.Checkroom, Color(0xFFEC4899)),
    KategoriUsaha("RETAIL_BEAUTY", "Kecantikan", Icons.Rounded.Spa, Color(0xFFF43F5E)),
    KategoriUsaha("RETAIL_ELECTRONIC", "Elektronik", Icons.Rounded.Devices, Color(0xFF0EA5E9)),
    KategoriUsaha("JASA_LAUNDRY", "Laundry", Icons.Rounded.LocalLaundryService, Color(0xFF06B6D4)),
    KategoriUsaha("JASA_BARBER", "Barber / Salon", Icons.Rounded.ContentCut, Color(0xFF8B5CF6)),
    KategoriUsaha("JASA_TEKNIK", "Bengkel / Teknik", Icons.Rounded.Build, Color(0xFF64748B)),
    KategoriUsaha("HEALTH_CLINIC", "Klinik", Icons.Rounded.LocalHospital, Color(0xFFEF4444)),
    KategoriUsaha("DEFAULT", "Lainnya", Icons.Rounded.Business, Color(0xFF5048E5)),
)

/** Cocokkan kategori unit (kode web ataupun label lama "FnB", "Retail") ke ikon & warna. */
fun kategoriDari(type: String?): KategoriUsaha {
    val t = (type ?: "").uppercase()
    KategoriUsahaList.firstOrNull { it.kode == t }?.let { return it }
    return when {
        t.startsWith("FNB") || "RESTO" in t || "CAFE" in t || "KOPI" in t -> KategoriUsahaList[0]
        t.startsWith("RETAIL") || "TOKO" in t -> KategoriUsahaList[3]
        "LAUNDRY" in t -> KategoriUsahaList[7]
        t.startsWith("JASA") || "SERVICE" in t -> KategoriUsahaList[9]
        t.startsWith("HEALTH") -> KategoriUsahaList[10]
        else -> KategoriUsahaList.last()
    }
}

fun sapaanWaktu(): String {
    val jam = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).hour
    return when (jam) {
        in 4..10 -> "Selamat pagi"
        in 11..14 -> "Selamat siang"
        in 15..17 -> "Selamat sore"
        else -> "Selamat malam"
    }
}

private val namaHariPanjang = listOf("Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu")

/** Jam & tanggal berjalan (widget jam di Beranda web). */
@Composable
private fun JamBeranda(modifier: Modifier = Modifier) {
    var sekarang by remember { mutableStateOf(Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault())) }
    LaunchedEffect(Unit) { while (true) { sekarang = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()); kotlinx.coroutines.delay(1000) } }
    fun d2(n: Int) = n.toString().padStart(2, '0')
    Row(
        modifier.clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = 0.14f)).padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Rounded.Schedule, null, tint = Color.White, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Column {
            Text("${d2(sekarang.hour)}:${d2(sekarang.minute)}:${d2(sekarang.second)}", style = MaterialTheme.typography.titleSmall, color = Color.White, fontWeight = FontWeight.Bold)
            Text(
                "${namaHariPanjang[sekarang.dayOfWeek.ordinal]}, ${sekarang.dayOfMonth} ${namaBulanPendek(sekarang.monthNumber)} ${sekarang.year}",
                style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.8f)
            )
        }
    }
}

private data class Divisi(val nama: String, val deskripsi: String, val icon: ImageVector, val warna: Color, val tujuan: Screen)

private val daftarDivisi = listOf(
    Divisi("Keuangan & POS", "Arus kas, kasir, stok, laporan laba rugi", Icons.Rounded.AccountBalanceWallet, BizgrowColors.Primary, Screen.Dashboard),
    Divisi("Penjualan (CRM)", "Pipeline deal penjualan & CRM", Icons.Rounded.Handshake, BizgrowColors.Violet, Screen.Crm),
    Divisi("Pemasaran (Ads)", "Analisis ads tracking & voucher campaign", Icons.Rounded.Campaign, Color(0xFFEC4899), Screen.Marketing),
    Divisi("Layanan CS", "Komplain & resolusi SLA support", Icons.Rounded.SupportAgent, BizgrowColors.Info, Screen.Cs),
    Divisi("E-Commerce Store", "Katalog online & pesanan", Icons.Rounded.ShoppingBag, BizgrowColors.Warning, Screen.Katalog),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(viewModel: AppViewModel) {
    val units by viewModel.units.collectAsState(initial = viewModel.units.value)
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    val unread by viewModel.unreadCount.collectAsState(initial = viewModel.unreadCount.value)
    val user = viewModel.currentUser
    var showCreate by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    // Divisi yang menunggu pilihan unit (bila punya lebih dari satu unit)
    var pilihUntuk by remember { mutableStateOf<Divisi?>(null) }
    // Unit pusat yang punya cabang (ketuk → pilih pusat/cabang, seperti popup "Akses Cabang" di web)
    var cabangDari by remember { mutableStateOf<BusinessUnit?>(null) }
    fun bukaDivisi(d: Divisi) {
        when {
            units.isEmpty() -> showCreate = true
            units.size == 1 -> { viewModel.selectUnit(units.first().id); viewModel.navigate(d.tujuan) }
            else -> pilihUntuk = d
        }
    }

    LaunchedEffect(Unit) { viewModel.loadUnits(); viewModel.loadNotifications() }

    val tampil = remember(units, query) {
        val q = query.trim().lowercase()
        if (q.isEmpty()) units else units.filter { it.name.lowercase().contains(q) || it.type.lowercase().contains(q) }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showCreate = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                shape = RoundedCornerShape(18.dp),
                icon = { Icon(Icons.Rounded.Add, null) },
                text = { Text("Bisnis Baru", fontWeight = FontWeight.Bold) }
            )
        }
    ) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(bottom = padding.calculateBottomPadding()),
            contentPadding = PaddingValues(bottom = 100.dp)
        ) {
            item {
                GradientCard(
                    colors = BizgrowColors.GradNight,
                    shape = RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp),
                    contentPadding = PaddingValues(0.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.statusBarsPadding().padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 26.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier.size(46.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    (user?.username?.firstOrNull() ?: 'B').uppercase(),
                                    style = MaterialTheme.typography.titleLarge,
                                    color = Color.White
                                )
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text("${sapaanWaktu()} 👋", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.8f))
                                Text(user?.username ?: "Pengguna", style = MaterialTheme.typography.titleLarge, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                            BizIconButton(Icons.Rounded.Notifications, "Notifikasi", badge = unread, tint = Color.White, container = Color.White.copy(alpha = 0.16f)) {
                                viewModel.navigate(Screen.Notifications)
                            }
                            Spacer(Modifier.width(8.dp))
                            BizIconButton(Icons.Rounded.Settings, "Pengaturan", tint = Color.White, container = Color.White.copy(alpha = 0.16f)) {
                                viewModel.navigate(Screen.Settings)
                            }
                        }
                        Spacer(Modifier.height(22.dp))
                        Text("Pilih bisnis untuk dikelola", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                        Text(
                            if (units.isEmpty()) "Mulai dengan membuat bisnis pertamamu" else "${units.size} unit bisnis terdaftar",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.75f)
                        )
                        Spacer(Modifier.height(14.dp))
                        JamBeranda()
                    }
                }
            }

            if (units.size > 4) {
                item {
                    BizSearchField(query, { query = it }, placeholder = "Cari unit bisnis…", modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 18.dp))
                }
            }

            when {
                uiState.isLoading && units.isEmpty() -> item { Spacer(Modifier.height(18.dp)); SkeletonList(rows = 4) }
                units.isEmpty() -> item {
                    EmptyView(
                        title = "Belum ada bisnis",
                        message = "Buat unit bisnis pertamamu untuk mulai mencatat penjualan, stok, dan keuangan.",
                        icon = Icons.Rounded.AddBusiness,
                        actionLabel = "Buat Bisnis",
                        onAction = { showCreate = true }
                    )
                }
                tampil.isEmpty() -> item { EmptyView("Tidak ditemukan", "Tidak ada unit dengan kata \"$query\".", Icons.Rounded.SearchOff) }
                else -> {
                    item { Spacer(Modifier.height(6.dp)) }
                    val utama = tampil.filter { it.cabangDari == null }
                    item {
                        SectionTitle(
                            "Struktur bisnis", Modifier.padding(start = 20.dp, end = 20.dp, top = 14.dp, bottom = 2.dp),
                            subtitle = "${utama.size} unit • ${units.count { it.cabangDari != null }} cabang",
                            actionLabel = "Kelola", onAction = { viewModel.navigate(Screen.Units) }
                        )
                    }
                    itemsIndexed(utama, key = { _, u -> u.id }) { i, unit ->
                        val anak = units.count { it.cabangDari == unit.id }
                        UnitCard(unit, Modifier.padding(horizontal = 20.dp, vertical = 6.dp).enterAnimation(i), jumlahCabang = anak) {
                            if (anak > 0) cabangDari = unit else { viewModel.selectUnit(unit.id); viewModel.navigate(Screen.Dashboard) }
                        }
                    }
                    item { KartuAiBeranda(viewModel, Modifier.padding(horizontal = 20.dp, vertical = 14.dp).enterAnimation(0)) }
                    item {
                        SectionTitle("Divisi bisnis", Modifier.padding(horizontal = 20.dp), subtitle = "Pusat komando unit usaha Anda")
                        Spacer(Modifier.height(8.dp))
                        daftarDivisi.forEachIndexed { i, d ->
                            BizSurface(
                                Modifier.padding(horizontal = 20.dp, vertical = 4.dp).fillMaxWidth().enterAnimation(i),
                                onClick = { bukaDivisi(d) }, contentPadding = PaddingValues(14.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconBadge(d.icon, d.warna)
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(d.nama, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                        Text(d.deskripsi, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Icon(Icons.Rounded.ChevronRight, null, tint = MaterialTheme.colorScheme.outline)
                                }
                            }
                        }
                    }
                    // Business Planning Wizard (sama dengan kartu "Planning" di halaman Struktur Bisnis web)
                    item {
                        BizSurface(
                            Modifier.padding(horizontal = 20.dp, vertical = 6.dp).fillMaxWidth().enterAnimation(0),
                            onClick = { viewModel.navigate(Screen.BusinessPlan) }, contentPadding = PaddingValues(14.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconBadge(Icons.Rounded.Map, BizgrowColors.Violet)
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text("Business Planning", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                    Text("Rancang rencana bisnis dengan bantuan AI, lalu terapkan jadi unit baru", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Icon(Icons.Rounded.ChevronRight, null, tint = MaterialTheme.colorScheme.outline)
                            }
                        }
                    }
                }
            }
            item { KalenderDeadline(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) }
            item { KabarTerbaru(Modifier.padding(horizontal = 20.dp, vertical = 10.dp)) }
            item { BizgrowAcademy(viewModel, Modifier.padding(horizontal = 20.dp, vertical = 6.dp)) }
            item { BantuanSistem(viewModel, Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) }
        }
    }

    pilihUntuk?.let { d ->
        ModalBottomSheet(
            onDismissRequest = { pilihUntuk = null },
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
                Text(d.nama, style = MaterialTheme.typography.titleLarge)
                Text("Pilih unit bisnis yang ingin dibuka", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(12.dp))
                units.forEach { u ->
                    UnitCard(u, Modifier.padding(vertical = 4.dp)) {
                        pilihUntuk = null
                        viewModel.selectUnit(u.id)
                        viewModel.navigate(d.tujuan)
                    }
                }
            }
        }
    }

    if (showCreate) {
        BuatUnitSheet(units, { if (!uiState.isLoading) showCreate = false }) { req ->
            viewModel.createUnit(req)
            showCreate = false
        }
    }

    cabangDari?.let { induk ->
        val anak = units.filter { it.cabangDari == induk.id }
        ModalBottomSheet(onDismissRequest = { cabangDari = null }, containerColor = MaterialTheme.colorScheme.surface) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
                Text("Akses cabang", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(induk.name, style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(12.dp))
                BizButton("Kantor pusat", onClick = { cabangDari = null; viewModel.selectUnit(induk.id); viewModel.navigate(Screen.Dashboard) }, icon = Icons.Rounded.Business, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(14.dp))
                SectionTitle("Daftar cabang", subtitle = "${anak.size} cabang")
                anak.forEach { c ->
                    UnitCard(c, Modifier.padding(vertical = 4.dp)) { cabangDari = null; viewModel.selectUnit(c.id); viewModel.navigate(Screen.Dashboard) }
                }
            }
        }
    }
}

@Composable
private fun UnitCard(unit: BusinessUnit, modifier: Modifier, jumlahCabang: Int = 0, onClick: () -> Unit) {
    val kat = kategoriDari(unit.type)
    BizSurface(modifier = modifier.fillMaxWidth(), onClick = onClick, contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(kat.icon, kat.tint, size = 52.dp, iconSize = 26.dp, shape = RoundedCornerShape(16.dp))
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(unit.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                    if (unit.isCabang == 1) {
                        Spacer(Modifier.width(6.dp))
                        StatusChip("Cabang", BizgrowColors.Info)
                    } else if (jumlahCabang > 0) {
                        Spacer(Modifier.width(6.dp))
                        StatusChip("$jumlahCabang cabang", BizgrowColors.Violet)
                    }
                }
                Spacer(Modifier.height(2.dp))
                Text(labelKategori(unit.type).takeIf { unit.type.isNotBlank() && DaftarKategoriWeb.any { it.kode == unit.type } } ?: kat.label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                val alamat = (unit.alamat ?: unit.settings?.alamat)?.takeIf { !it.startsWith("Alamat default") }
                if (!alamat.isNullOrBlank()) {
                    Text(alamat, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Box(
                Modifier.size(34.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Rounded.ArrowForward, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
            }
        }
    }
}
