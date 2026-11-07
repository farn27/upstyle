package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.ModuleTile
import com.upstyle.bizgrow.ui.design.enterAnimation
import com.upstyle.bizgrow.ui.design.pressClick
import com.upstyle.bizgrow.ui.theme.BizMotion
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import com.upstyle.bizgrow.ui.theme.LocalBizPalette

private data class TabItem(val label: String, val icon: ImageVector, val iconSelected: ImageVector, val screen: Screen)

private val tabsKiri = listOf(
    TabItem("Beranda", Icons.Rounded.Home, Icons.Rounded.Home, Screen.Dashboard),
    TabItem("Kasir", Icons.Rounded.PointOfSale, Icons.Rounded.PointOfSale, Screen.Pos),
)
private val tabsKanan = listOf(
    TabItem("Fitur", Icons.Rounded.GridView, Icons.Rounded.Apps, Screen.Modules),
    TabItem("Akun", Icons.Rounded.PersonOutline, Icons.Rounded.Person, Screen.Profile),
)

/** Layar yang dianggap "tab utama" — tab lain tidak aktif saat berada di sini. */
private fun tabAktif(current: Screen): Screen? = when (current) {
    is Screen.Dashboard, is Screen.Home -> Screen.Dashboard
    is Screen.Pos -> Screen.Pos
    is Screen.Modules -> Screen.Modules
    is Screen.Profile, is Screen.Settings -> Screen.Profile
    is Screen.AiChat -> Screen.AiChat
    else -> null
}

/**
 * Bottom navigation melayang: 4 tab + tombol aksi cepat di tengah.
 * Animasi hanya pada warna & skala ikon (graphicsLayer) supaya ringan.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BottomNavBar(viewModel: AppViewModel, currentScreen: Screen) {
    val unreadCount by viewModel.unreadCount.collectAsState(initial = viewModel.unreadCount.value)
    var showQuick by remember { mutableStateOf(false) }
    val aktif = tabAktif(currentScreen)

    fun buka(tab: Screen) {
        if (aktif != tab) {
            if (tab is Screen.Dashboard) viewModel.navigateToRoot(Screen.Dashboard) else viewModel.navigate(tab)
        }
    }

    Box(
        Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(start = 14.dp, end = 14.dp, bottom = 10.dp, top = 4.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .height(66.dp)
                .shadow(18.dp, RoundedCornerShape(24.dp), ambientColor = Color(0x22000000), spotColor = Color(0x33000000))
                .clip(RoundedCornerShape(24.dp))
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, LocalBizPalette.current.border, RoundedCornerShape(24.dp))
                .padding(horizontal = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            tabsKiri.forEach { tab ->
                NavTab(tab, selected = aktif == tab.screen, badge = 0, modifier = Modifier.weight(1f)) { buka(tab.screen) }
            }
            Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                TombolTengah(
                    aktif = aktif is Screen.AiChat,
                    onClick = { if (aktif !is Screen.AiChat) viewModel.navigate(Screen.AiChat) },
                    onLongClick = { showQuick = true }
                )
            }
            tabsKanan.forEach { tab ->
                NavTab(
                    tab,
                    selected = aktif == tab.screen,
                    badge = if (tab.screen is Screen.Profile) unreadCount else 0,
                    modifier = Modifier.weight(1f)
                ) { buka(tab.screen) }
            }
        }
    }

    if (showQuick) {
        ModalBottomSheet(
            onDismissRequest = { showQuick = false },
            containerColor = MaterialTheme.colorScheme.surface,
            dragHandle = { BottomSheetDefaults.DragHandle(color = MaterialTheme.colorScheme.outline) }
        ) {
            QuickActionSheet { target ->
                showQuick = false
                viewModel.navigate(target)
            }
        }
    }
}

@Composable
private fun NavTab(tab: TabItem, selected: Boolean, badge: Int, modifier: Modifier, onClick: () -> Unit) {
    val warna by animateColorAsState(
        if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
        BizMotion.fast(), label = "tabColor"
    )
    val latar by animateColorAsState(
        if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else Color.Transparent,
        BizMotion.fast(), label = "tabBg"
    )
    val skala by animateFloatAsState(if (selected) 1.08f else 1f, BizMotion.bouncy(), label = "tabScale")

    Column(
        modifier
            .clip(RoundedCornerShape(18.dp))
            .pressClick(onClick = onClick)
            .padding(vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box {
            Box(
                Modifier
                    .width(46.dp)
                    .height(28.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(latar),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (selected) tab.iconSelected else tab.icon,
                    contentDescription = tab.label,
                    tint = warna,
                    modifier = Modifier.size(22.dp).graphicsLayer { scaleX = skala; scaleY = skala }
                )
            }
            if (badge > 0) {
                Box(
                    Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = (-4).dp, y = (-2).dp)
                        .size(9.dp)
                        .clip(CircleShape)
                        .background(BizgrowColors.Danger)
                        .border(1.5.dp, MaterialTheme.colorScheme.surface, CircleShape)
                )
            }
        }
        Spacer(Modifier.height(3.dp))
        Text(
            tab.label,
            style = MaterialTheme.typography.labelSmall,
            color = warna,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            maxLines = 1
        )
    }
}

/**
 * Tombol tengah = Bizgrow AI (asisten semua hal). Ketuk → buka chat AI, tahan → aksi cepat.
 * Cincin lembut berdenyut pelan (hanya alpha/skala di graphicsLayer) supaya mudah ditemukan.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun TombolTengah(aktif: Boolean, onClick: () -> Unit, onLongClick: () -> Unit) {
    val skalaAwal = remember { Animatable(0.6f) }
    LaunchedEffect(Unit) { skalaAwal.animateTo(1f, BizMotion.bouncy()) }
    val denyut = rememberInfiniteTransition(label = "aiPulse")
    val cincin by denyut.animateFloat(1f, 1.45f, infiniteRepeatable(tween(1800, easing = FastOutSlowInEasing), RepeatMode.Restart), label = "ring")
    val alfa by denyut.animateFloat(0.35f, 0f, infiniteRepeatable(tween(1800, easing = FastOutSlowInEasing), RepeatMode.Restart), label = "ringA")
    val source = remember { MutableInteractionSource() }
    val ditekan by source.collectIsPressedAsState()
    val tekan by animateFloatAsState(if (ditekan) 0.9f else 1f, BizMotion.snappy(), label = "aiPress")

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(contentAlignment = Alignment.Center) {
            if (!aktif) {
                Box(
                    Modifier.size(52.dp).graphicsLayer { scaleX = cincin; scaleY = cincin; alpha = alfa }
                        .clip(RoundedCornerShape(18.dp)).background(GradAi.last())
                )
            }
            Box(
                Modifier
                    .size(52.dp)
                    .graphicsLayer { scaleX = skalaAwal.value * tekan; scaleY = skalaAwal.value * tekan }
                    .shadow(10.dp, RoundedCornerShape(18.dp), spotColor = GradAi[1].copy(alpha = 0.6f))
                    .clip(RoundedCornerShape(18.dp))
                    .background(Brush.linearGradient(GradAi))
                    .combinedClickable(interactionSource = source, indication = null, onClick = onClick, onLongClick = onLongClick),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Rounded.AutoAwesome, contentDescription = "Tanya Bizgrow AI", tint = Color.White, modifier = Modifier.size(26.dp))
            }
        }
        Text("AI", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.ExtraBold, color = if (aktif) GradAi[1] else MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private data class AksiCepat(val label: String, val icon: ImageVector, val tint: Color, val target: Screen)

@Composable
private fun QuickActionSheet(onPick: (Screen) -> Unit) {
    val aksi = listOf(
        AksiCepat("Catat Transaksi", Icons.Rounded.EditNote, BizgrowColors.Primary, Screen.TransactionEntry),
        AksiCepat("Kasir", Icons.Rounded.PointOfSale, BizgrowColors.Success, Screen.Pos),
        AksiCepat("Scan Barcode", Icons.Rounded.QrCodeScanner, BizgrowColors.Info, Screen.BarcodeScanner),
        AksiCepat("Tambah Produk", Icons.Rounded.AddBox, BizgrowColors.Warning, Screen.Products),
        AksiCepat("Invoice Piutang", Icons.Rounded.RequestQuote, BizgrowColors.Violet, Screen.Piutang),
        AksiCepat("Tagihan Hutang", Icons.Rounded.Payments, BizgrowColors.Danger, Screen.Hutang),
        AksiCepat("Kontak CRM", Icons.Rounded.PersonAdd, Color(0xFF14B8A6), Screen.CrmContacts),
        AksiCepat("Tanya AI", Icons.Rounded.AutoAwesome, Color(0xFFEC4899), Screen.AiChat),
    )
    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
        Text("Aksi Cepat", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
        Text("Pilih yang ingin kamu lakukan sekarang", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        LazyVerticalGrid(
            columns = GridCells.Fixed(4),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            userScrollEnabled = false,
            modifier = Modifier.heightIn(max = 260.dp)
        ) {
            itemsIndexed(aksi) { i, a ->
                ModuleTile(a.label, a.icon, a.tint, modifier = Modifier.enterAnimation(i)) { onPick(a.target) }
            }
        }
    }
}
