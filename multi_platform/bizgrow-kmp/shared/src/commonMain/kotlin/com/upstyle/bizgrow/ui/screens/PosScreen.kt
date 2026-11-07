package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Undo
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.PosCustomer
import com.upstyle.bizgrow.data.Product
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizMotion
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import com.upstyle.bizgrow.ui.theme.LocalBizPalette
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PosScreen(viewModel: AppViewModel) {
    val products by viewModel.products.collectAsState(initial = viewModel.products.value)
    val posData by viewModel.posData.collectAsState(initial = viewModel.posData.value)
    val cart by viewModel.cart.collectAsState(initial = viewModel.cart.value)
    val cartTotal by viewModel.cartTotal.collectAsState(initial = viewModel.cartTotal.value)
    val itemCount by viewModel.cartItemCount.collectAsState(initial = viewModel.cartItemCount.value)
    val activeUnit by viewModel.activeUnit.collectAsState(initial = viewModel.activeUnit.value)
    val productsState by viewModel.productsState.collectAsState(initial = viewModel.productsState.value)
    var showCheckout by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }
    var kategori by remember { mutableStateOf<String?>(null) }
    var query by remember { mutableStateOf("") }
    var sukses by remember { mutableStateOf<Double?>(null) }
    val serverUrl = remember { viewModel.session.getServerUrl() }

    LaunchedEffect(Unit) {
        viewModel.loadProducts()
        viewModel.loadPosData()
    }

    // Hanya barang jadi aktif yang tampil di kasir (bahan baku/kemasan ditolak server)
    val jual = remember(products) { products.filter { it.bisaDijual && it.showInPos != 0 && it.status != "archived" } }
    val kategoriList = remember(jual) { jual.map { it.kategori }.filter { it.isNotBlank() }.distinct().sorted() }
    val tampil = remember(jual, kategori, query) {
        val q = query.trim().lowercase()
        jual.filter {
            (kategori == null || it.kategori == kategori) &&
                (q.isEmpty() || it.nama.lowercase().contains(q) || it.sku.lowercase().contains(q) || (it.barcode ?: "").contains(q))
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            BizTopBar(
                title = "Kasir",
                subtitle = activeUnit?.name,
                actions = {
                    BizIconButton(Icons.Rounded.QrCodeScanner, "Scan barcode") { viewModel.navigate(Screen.BarcodeScanner) }
                    Spacer(Modifier.width(8.dp))
                    Box {
                        BizIconButton(Icons.Rounded.MoreVert, "Menu kasir") { showMenu = true }
                        DropdownMenu(showMenu, { showMenu = false }, shape = RoundedCornerShape(16.dp)) {
                            DropdownMenuItem({ Text("Shift kasir") }, { showMenu = false; viewModel.navigate(Screen.PosShift) }, leadingIcon = { Icon(Icons.Rounded.Schedule, null) })
                            DropdownMenuItem({ Text("Retur penjualan") }, { showMenu = false; viewModel.navigate(Screen.PosReturn) }, leadingIcon = { Icon(Icons.AutoMirrored.Rounded.Undo, null) })
                            DropdownMenuItem({ Text("Voucher & promo") }, { showMenu = false; viewModel.navigate(Screen.PosVouchers) }, leadingIcon = { Icon(Icons.Rounded.LocalOffer, null) })
                            if (cart.isNotEmpty()) {
                                HorizontalDivider()
                                DropdownMenuItem({ Text("Kosongkan keranjang", color = BizgrowColors.Danger) }, { showMenu = false; viewModel.clearCart() }, leadingIcon = { Icon(Icons.Rounded.RemoveShoppingCart, null, tint = BizgrowColors.Danger) })
                            }
                        }
                    }
                    Spacer(Modifier.width(4.dp))
                }
            )
        },
        bottomBar = {
            Column {
                CartBar(itemCount, cartTotal) { showCheckout = true }
                BottomNavBar(viewModel, Screen.Pos)
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            BizSearchField(query, { query = it }, placeholder = "Cari produk, SKU, atau barcode", modifier = Modifier.padding(horizontal = 20.dp))
            if (kategoriList.isNotEmpty()) {
                LazyRow(contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item { FilterPill("Semua", kategori == null, { kategori = null }) }
                    items(kategoriList) { k -> FilterPill(k, kategori == k, { kategori = if (kategori == k) null else k }) }
                }
            } else Spacer(Modifier.height(12.dp))

            when {
                productsState.isLoading && jual.isEmpty() -> SkeletonList(rows = 6)
                jual.isEmpty() -> EmptyView(
                    "Belum ada produk untuk dijual",
                    "Tambahkan produk (jenis Barang Jadi) agar muncul di kasir.",
                    Icons.Rounded.Inventory2,
                    actionLabel = "Kelola produk",
                    onAction = { viewModel.navigate(Screen.Products) }
                )
                tampil.isEmpty() -> EmptyView("Produk tidak ditemukan", "Coba kata kunci lain.", Icons.Rounded.SearchOff)
                else -> LazyVerticalGrid(
                    GridCells.Adaptive(minSize = 156.dp),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    itemsIndexed(tampil, key = { _, p -> p.id }) { i, p ->
                        ProdukKasirCard(
                            p, cart[p] ?: 0, serverUrl,
                            modifier = Modifier.animateItem().enterAnimation(i),
                            onAdd = { viewModel.addToCart(p) },
                            onRemove = { viewModel.removeFromCart(p) }
                        )
                    }
                }
            }
        }
    }

    val printer = com.upstyle.bizgrow.device.rememberPrinterManager()
    if (showCheckout) {
        ModalBottomSheet(
            onDismissRequest = { showCheckout = false },
            containerColor = MaterialTheme.colorScheme.surface,
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            CheckoutSheet(
                viewModel = viewModel,
                cart = cart,
                subtotal = cartTotal,
                customers = posData?.customers.orEmpty(),
                serverUrl = serverUrl,
                onPrint = {
                    val struk = buildString {
                        appendLine("===== STRUK PEMBAYARAN =====")
                        appendLine(viewModel.activeUnit.value?.name ?: "Toko")
                        appendLine("----------------------------")
                        cart.forEach { (p, q) -> appendLine("${p.nama} x$q"); appendLine("  ${(p.hargaJual * q).rupiah()}") }
                        appendLine("----------------------------")
                        appendLine("Total: ${cartTotal.rupiah()}")
                        appendLine("Terima kasih!")
                        appendLine("\n\n")
                    }
                    printer.connectAndPrint(
                        macAddress = "00:00:00:00:00:00",
                        receiptText = struk,
                        onSuccess = {},
                        onError = { viewModel.showError("Printer belum dikonfigurasi. Atur printer di Pengaturan.") }
                    )
                },
                onPaid = { total ->
                    showCheckout = false
                    sukses = total
                }
            )
        }
    }

    sukses?.let { total -> SuksesBayarDialog(total) { sukses = null } }
}

@Composable
private fun CartBar(itemCount: Int, total: Double, onClick: () -> Unit) {
    // Memantul kecil setiap jumlah barang bertambah
    val pantul = remember { Animatable(1f) }
    LaunchedEffect(itemCount) {
        if (itemCount > 0) {
            pantul.snapTo(0.94f)
            pantul.animateTo(1f, spring(dampingRatio = 0.4f, stiffness = 600f))
        }
    }
    AnimatedVisibility(
        visible = itemCount > 0,
        enter = slideInVertically(BizMotion.medium()) { it } + fadeIn(),
        exit = slideOutVertically(BizMotion.fast()) { it } + fadeOut()
    ) {
        Row(
            Modifier
                .padding(start = 14.dp, end = 14.dp, top = 6.dp)
                .fillMaxWidth()
                .graphicsLayer { scaleX = pantul.value; scaleY = pantul.value }
                .shadow(14.dp, RoundedCornerShape(20.dp), spotColor = BizgrowColors.Primary.copy(alpha = 0.4f))
                .clip(RoundedCornerShape(20.dp))
                .background(Brush.horizontalGradient(BizgrowColors.GradPrimary))
                .pressClick(pressedScale = 0.98f, onClick = onClick)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.ShoppingCart, null, tint = Color.White, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("$itemCount barang", style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.85f))
                AnimatedAmount(total, MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), Color.White)
            }
            Text("Bayar", style = MaterialTheme.typography.labelLarge, color = Color.White, fontWeight = FontWeight.Bold)
            Icon(Icons.Rounded.ChevronRight, null, tint = Color.White)
        }
    }
}

@Composable
private fun ProdukKasirCard(p: Product, qty: Int, serverUrl: String, modifier: Modifier, onAdd: () -> Unit, onRemove: () -> Unit) {
    val habis = p.stok <= 0
    val menipis = !habis && p.stok <= p.minStok
    val diKeranjang = qty > 0
    val border by animateColorAsState(if (diKeranjang) MaterialTheme.colorScheme.primary else LocalBizPalette.current.border, BizMotion.fast(), label = "b")
    Column(
        modifier
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(if (diKeranjang) 1.5.dp else 1.dp, border, RoundedCornerShape(20.dp))
            .pressClick(enabled = !habis, pressedScale = 0.97f, onClick = onAdd)
            .graphicsLayer { alpha = if (habis) 0.55f else 1f }
    ) {
        Box {
            ProductThumb(p.nama, p.foto, Modifier.fillMaxWidth().aspectRatio(1.35f), RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp), serverUrl)
            when {
                habis -> StatusChip("Habis", BizgrowColors.Danger, Modifier.padding(8.dp).background(MaterialTheme.colorScheme.surface, RoundedCornerShape(50)))
                menipis -> StatusChip("Sisa ${p.stok}", BizgrowColors.Warning, Modifier.padding(8.dp).background(MaterialTheme.colorScheme.surface, RoundedCornerShape(50)))
            }
            androidx.compose.animation.AnimatedVisibility(
                diKeranjang,
                modifier = Modifier.align(Alignment.TopEnd).padding(8.dp),
                enter = scaleIn(BizMotion.bouncy()) + fadeIn(),
                exit = scaleOut() + fadeOut()
            ) {
                Box(Modifier.size(28.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                    Text("$qty", style = MaterialTheme.typography.labelMedium, color = Color.White)
                }
            }
        }
        Column(Modifier.padding(12.dp)) {
            Text(p.nama, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface, maxLines = 2, minLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(p.hargaJual.rupiah(), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), maxLines = 1)
                AnimatedContent(diKeranjang, transitionSpec = { (fadeIn() + scaleIn()) togetherWith (fadeOut() + scaleOut()) }, label = "aksi") { ada ->
                    if (ada) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Stepper(Icons.Rounded.Remove, onRemove)
                            Spacer(Modifier.width(6.dp))
                            Stepper(Icons.Rounded.Add, onAdd, enabled = qty < p.stok)
                        }
                    } else {
                        Stepper(Icons.Rounded.Add, onAdd, enabled = !habis, filled = true)
                    }
                }
            }
        }
    }
}

@Composable
private fun Stepper(icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit, enabled: Boolean = true, filled: Boolean = false) {
    Box(
        Modifier
            .size(30.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(if (filled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
            .pressClick(enabled = enabled, pressedScale = 0.85f, onClick = onClick)
            .graphicsLayer { alpha = if (enabled) 1f else 0.4f },
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, null, tint = if (filled) Color.White else MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
    }
}

private data class MetodeBayar(val kode: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)
private val metodeList = listOf(
    MetodeBayar("CASH", "Tunai", Icons.Rounded.Payments),
    MetodeBayar("QRIS", "QRIS", Icons.Rounded.QrCode2),
    MetodeBayar("TRANSFER", "Transfer", Icons.Rounded.AccountBalance),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CheckoutSheet(
    viewModel: AppViewModel,
    cart: Map<Product, Int>,
    subtotal: Double,
    customers: List<PosCustomer>,
    serverUrl: String,
    onPrint: () -> Unit,
    onPaid: (Double) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    val diskonVm by viewModel.posDiskon.collectAsState(initial = viewModel.posDiskon.value)
    val customerId by viewModel.selectedCustomerId.collectAsState(initial = viewModel.selectedCustomerId.value)
    var diskonText by remember { mutableStateOf(if (diskonVm == 0.0) "" else diskonVm.toLong().toString()) }
    var metode by remember { mutableStateOf("CASH") }
    var diterimaText by remember { mutableStateOf("") }
    var pilihPelanggan by remember { mutableStateOf(false) }

    val diskon = (diskonText.toDoubleOrNull() ?: 0.0).coerceIn(0.0, subtotal)
    LaunchedEffect(diskon) { viewModel.setDiskon(diskon) }
    val total = subtotal - diskon
    val diterima = diterimaText.toDoubleOrNull() ?: 0.0
    val kembalian = diterima - total
    val pelanggan = customers.find { it.id == customerId }

    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 28.dp).imePadding()
    ) {
        Text("Pembayaran", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.height(14.dp))

        BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)) {
            cart.entries.forEachIndexed { i, (p, q) ->
                Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    ProductThumb(p.nama, p.foto, Modifier.size(42.dp), RoundedCornerShape(12.dp), serverUrl, fontSize = androidx.compose.ui.unit.TextUnit(14f, androidx.compose.ui.unit.TextUnitType.Sp))
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(p.nama, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("${p.hargaJual.rupiah()} × $q", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Stepper(Icons.Rounded.Remove, { viewModel.removeFromCart(p) })
                    Text("$q", Modifier.width(30.dp), style = MaterialTheme.typography.titleSmall, textAlign = androidx.compose.ui.text.style.TextAlign.Center, color = MaterialTheme.colorScheme.onSurface)
                    Stepper(Icons.Rounded.Add, { viewModel.addToCart(p) }, enabled = q < p.stok)
                }
                if (i < cart.size - 1) HorizontalDivider(color = LocalBizPalette.current.border)
            }
        }

        Spacer(Modifier.height(14.dp))
        ListRow(
            title = pelanggan?.namaCustomer ?: "Pelanggan umum",
            subtitle = if (customers.isEmpty()) "Belum ada data pelanggan" else "Ketuk untuk memilih pelanggan",
            icon = Icons.Rounded.Person,
            tint = BizgrowColors.Info,
            showChevron = customers.isNotEmpty(),
            onClick = if (customers.isNotEmpty()) ({ pilihPelanggan = true }) else null
        )
        DropdownMenu(pilihPelanggan, { pilihPelanggan = false }, shape = RoundedCornerShape(16.dp)) {
            DropdownMenuItem({ Text("Pelanggan umum") }, { viewModel.setCustomer(null); pilihPelanggan = false })
            customers.forEach { c -> DropdownMenuItem({ Text(c.namaCustomer) }, { viewModel.setCustomer(c.id); pilihPelanggan = false }) }
        }

        Spacer(Modifier.height(8.dp))
        BizTextField(diskonText, { diskonText = it.filter(Char::isDigit) }, "Diskon (Rp)", leadingIcon = Icons.Rounded.LocalOffer, keyboardType = KeyboardType.Number)

        Spacer(Modifier.height(14.dp))
        Text("Metode bayar", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            metodeList.forEach { m ->
                val aktif = metode == m.kode
                val bg by animateColorAsState(if (aktif) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface, BizMotion.fast(), label = "m")
                Column(
                    Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .background(bg)
                        .border(if (aktif) 1.5.dp else 1.dp, if (aktif) MaterialTheme.colorScheme.primary else LocalBizPalette.current.border, RoundedCornerShape(16.dp))
                        .pressClick { metode = m.kode }
                        .padding(vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(m.icon, null, tint = if (aktif) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(4.dp))
                    Text(m.label, style = MaterialTheme.typography.labelMedium, color = if (aktif) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        AnimatedVisibility(metode == "CASH", enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
            Column(Modifier.padding(top = 12.dp)) {
                BizTextField(diterimaText, { diterimaText = it.filter(Char::isDigit) }, "Uang diterima", leadingIcon = Icons.Rounded.Payments, keyboardType = KeyboardType.Number)
                Spacer(Modifier.height(8.dp))
                // Nominal cepat: uang pas & pecahan umum di atas total
                val saran = remember(total) {
                    val pecahan = listOf(5_000.0, 10_000.0, 20_000.0, 50_000.0, 100_000.0)
                    (listOf(total) + pecahan.map { p -> kotlin.math.ceil(total / p) * p }).filter { it >= total && it > 0 }.distinct().take(4)
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(saran) { s -> FilterPill(if (s == total) "Uang pas" else s.rupiahRingkas(), diterima == s, { diterimaText = s.toLong().toString() }) }
                }
                if (diterima > 0) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        if (kembalian >= 0) "Kembalian ${kembalian.rupiah()}" else "Kurang ${(-kembalian).rupiah()}",
                        style = MaterialTheme.typography.titleSmall,
                        color = if (kembalian >= 0) BizgrowColors.Success else BizgrowColors.Danger
                    )
                }
            }
        }

        Spacer(Modifier.height(16.dp))
        BizSurface(Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.surfaceVariant, border = false) {
            BarisTotal("Subtotal", subtotal.rupiah())
            if (diskon > 0) BarisTotal("Diskon", "-${diskon.rupiah()}", BizgrowColors.Danger)
            HorizontalDivider(Modifier.padding(vertical = 8.dp), color = LocalBizPalette.current.border)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Total", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                AnimatedAmount(total, MaterialTheme.typography.headlineSmall, MaterialTheme.colorScheme.primary)
            }
        }

        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            BizOutlineButton("Struk", onPrint, icon = Icons.Rounded.Print, modifier = Modifier.height(54.dp))
            BizButton(
                "Bayar ${total.rupiahRingkas()}",
                onClick = { viewModel.checkout(metode) { ok -> if (ok) onPaid(total) } },
                loading = uiState.isLoading,
                enabled = cart.isNotEmpty() && (metode != "CASH" || diterima == 0.0 || kembalian >= 0),
                icon = Icons.Rounded.CheckCircle,
                colors = BizgrowColors.GradSuccess,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun BarisTotal(label: String, nilai: String, warna: Color = MaterialTheme.colorScheme.onSurface) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(nilai, style = MaterialTheme.typography.bodyMedium, color = warna)
    }
}

@Composable
private fun SuksesBayarDialog(total: Double, onDismiss: () -> Unit) {
    val skala = remember { Animatable(0.3f) }
    LaunchedEffect(Unit) {
        skala.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = 300f))
        delay(1800)
        onDismiss()
    }
    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier.clip(RoundedCornerShape(28.dp)).background(MaterialTheme.colorScheme.surface).padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                Modifier.size(84.dp).graphicsLayer { scaleX = skala.value; scaleY = skala.value }
                    .clip(CircleShape).background(Brush.linearGradient(BizgrowColors.GradSuccess)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Rounded.Check, null, tint = Color.White, modifier = Modifier.size(46.dp))
            }
            Spacer(Modifier.height(16.dp))
            Text("Pembayaran berhasil", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
            Text(total.rupiah(), style = MaterialTheme.typography.headlineSmall, color = BizgrowColors.Success)
        }
    }
}
