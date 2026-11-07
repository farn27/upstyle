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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(viewModel: AppViewModel) {
    val units by viewModel.units.collectAsState(initial = viewModel.units.value)
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    val unread by viewModel.unreadCount.collectAsState(initial = viewModel.unreadCount.value)
    val user = viewModel.currentUser
    var showCreate by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { viewModel.loadUnits() }

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
                    item { Spacer(Modifier.height(14.dp)) }
                    itemsIndexed(tampil, key = { _, u -> u.id }) { i, unit ->
                        UnitCard(unit, Modifier.padding(horizontal = 20.dp, vertical = 6.dp).enterAnimation(i)) {
                            viewModel.selectUnit(unit.id)
                            viewModel.navigate(Screen.Dashboard)
                        }
                    }
                }
            }
        }
    }

    if (showCreate) {
        ModalBottomSheet(
            onDismissRequest = { if (!uiState.isLoading) showCreate = false },
            containerColor = MaterialTheme.colorScheme.surface,
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            CreateUnitSheet(isLoading = uiState.isLoading) { nama, kode ->
                viewModel.createUnit(nama, kode)
                showCreate = false
            }
        }
    }
}

@Composable
private fun UnitCard(unit: BusinessUnit, modifier: Modifier, onClick: () -> Unit) {
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
                    }
                }
                Spacer(Modifier.height(2.dp))
                Text(kat.label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                val alamat = unit.alamat ?: unit.settings?.alamat
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

@Composable
private fun CreateUnitSheet(isLoading: Boolean, onCreate: (String, String) -> Unit) {
    var nama by remember { mutableStateOf("") }
    var kode by remember { mutableStateOf(KategoriUsahaList[3].kode) }
    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp).imePadding()) {
        Text("Bisnis baru", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
        Text("Kategori menentukan fitur kasir yang aktif otomatis", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        BizTextField(nama, { nama = it }, "Nama bisnis", leadingIcon = Icons.Rounded.Storefront, placeholder = "mis. Kopi Senja")
        Spacer(Modifier.height(16.dp))
        Text("Kategori", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.height(8.dp))
        LazyVerticalGrid(
            GridCells.Fixed(3),
            modifier = Modifier.heightIn(max = 300.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(KategoriUsahaList) { k ->
                val dipilih = k.kode == kode
                Column(
                    Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (dipilih) k.tint.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface)
                        .border(if (dipilih) 1.5.dp else 1.dp, if (dipilih) k.tint else LocalBizPalette.current.border, RoundedCornerShape(16.dp))
                        .pressClick { kode = k.kode }
                        .padding(vertical = 12.dp, horizontal = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(k.icon, null, tint = k.tint, modifier = Modifier.size(24.dp))
                    Spacer(Modifier.height(6.dp))
                    Text(k.label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
        Spacer(Modifier.height(20.dp))
        BizButton(
            "Buat Bisnis",
            onClick = { onCreate(nama.trim(), kode) },
            enabled = nama.trim().length >= 2,
            loading = isLoading,
            icon = Icons.Rounded.Check,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
