package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import com.upstyle.bizgrow.ui.components.InfoRow
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import coil3.compose.AsyncImage
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProdukDetailScreen(viewModel: AppViewModel, productId: String) {
    val products by viewModel.products.collectAsState(initial = viewModel.products.value)
    val stockLogs by viewModel.stockLogs.collectAsState(initial = viewModel.stockLogs.value)
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    val product = products.find { it.id == productId }

    var showAdjustSheet by remember { mutableStateOf(false) }
    var showEditSheet by remember { mutableStateOf(false) }
    var selectedTab by remember { mutableStateOf(0) }

    LaunchedEffect(productId) { viewModel.loadStockLogs(productId) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(product?.nama ?: "Detail Produk", maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, null)
                    }
                },
                actions = {
                    if (product != null) {
                        IconButton(onClick = { showEditSheet = true }) {
                            Icon(Icons.Default.Edit, null)
                        }
                        IconButton(onClick = { showAdjustSheet = true }) {
                            Icon(Icons.Default.Tune, null)
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (product == null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.ErrorOutline, null, Modifier.size(64.dp), tint = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.height(8.dp))
                    Text("Produk tidak ditemukan", color = MaterialTheme.colorScheme.error)
                }
            }
            return@Scaffold
        }

        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Product header image
            Box(modifier = Modifier.fillMaxWidth().height(200.dp)) {
                AsyncImage(
                    model = product.foto?.takeIf { it.isNotBlank() }
                        ?: "https://ui-avatars.com/api/?name=${product.nama.take(2)}&background=EEF2FF&color=5B50F0&size=400&bold=true",
                    contentDescription = product.nama,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                // Stock badge overlay
                val isLowStock = product.stok in 1..product.minStok
                val isHabis = product.stok == 0
                val (badgeColor, badgeText) = when {
                    isHabis -> Color(0xFFEF4444) to "HABIS"
                    isLowStock -> Color(0xFFF59E0B) to "LOW STOK"
                    else -> Color(0xFF22C55E) to "TERSEDIA"
                }
                Surface(
                    modifier = Modifier.align(Alignment.TopEnd).padding(12.dp),
                    color = badgeColor,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(badgeText, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
                }
            }

            // Tabs
            TabRow(selectedTabIndex = selectedTab) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Info Produk") })
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Riwayat Stok") })
            }

            when (selectedTab) {
                0 -> ProductInfoTab(product, viewModel, onAdjust = { showAdjustSheet = true })
                1 -> StockHistoryTab(stockLogs.filter { it.productId == productId }, isLoading = uiState.isLoading)
            }
        }
    }

    if (showAdjustSheet && product != null) {
        StockAdjustSheet(product, viewModel, onDismiss = { showAdjustSheet = false })
    }
    if (showEditSheet && product != null) {
        EditProductSheet(product, viewModel, onDismiss = { showEditSheet = false })
    }
}

@Composable
fun ProductInfoTab(product: Product, viewModel: AppViewModel, onAdjust: () -> Unit) {
    val isLowStock = product.stok in 1..product.minStok
    val isHabis = product.stok == 0
    val stockColor = when { isHabis -> Color(0xFFEF4444); isLowStock -> Color(0xFFF59E0B); else -> Color(0xFF22C55E) }
    val margin = if (product.hargaBeli > 0) ((product.hargaJual - product.hargaBeli) / product.hargaBeli * 100).toInt() else 0

    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Stock hero
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = stockColor.copy(alpha = 0.08f)), elevation = CardDefaults.cardElevation(0.dp)) {
                Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("Stok Saat Ini", fontSize = 12.sp, color = stockColor)
                        Text("${product.stok} unit", fontWeight = FontWeight.ExtraBold, fontSize = 28.sp, color = stockColor)
                        Text("Min: ${product.minStok} unit", fontSize = 11.sp, color = stockColor.copy(alpha = 0.7f))
                    }
                    OutlinedButton(onClick = onAdjust, shape = RoundedCornerShape(20.dp)) {
                        Icon(Icons.Default.Tune, null, Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Sesuaikan")
                    }
                }
            }
        }

        // Pricing
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Harga", fontWeight = FontWeight.Bold)
                    HorizontalDivider()
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Harga Beli", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(formatCurrency(product.hargaBeli.toDouble()), fontWeight = FontWeight.Medium)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Harga Jual", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(formatCurrency(product.hargaJual.toDouble()), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Margin", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("$margin%", fontWeight = FontWeight.Bold, color = if (margin >= 0) Color(0xFF22C55E) else Color(0xFFEF4444))
                    }
                    val potensialOmzet = product.hargaJual * product.stok
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Nilai Stok", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(formatCurrency(potensialOmzet.toDouble()), fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        // Product details
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Detail Produk", fontWeight = FontWeight.Bold)
                    HorizontalDivider()
                    InfoRow("Nama", product.nama)
                    InfoRow("SKU", product.sku.ifBlank { "-" })
                    InfoRow("Kategori", product.kategori.ifBlank { "Umum" })
                    product.barcode?.let { if (it.isNotBlank()) InfoRow("Barcode", it) }
                }
            }
        }

        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
fun StockHistoryTab(logs: List<StockLog>, isLoading: Boolean) {
    if (isLoading && logs.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }
    if (logs.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.History, null, Modifier.size(56.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
                Text("Belum ada riwayat stok", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        return
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(logs) { log -> StockLogCard(log) }
        item { Spacer(Modifier.height(80.dp)) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockAdjustSheet(product: Product, viewModel: AppViewModel, onDismiss: () -> Unit) {
    var stockDelta by remember { mutableStateOf(0) }
    var reason by remember { mutableStateOf("") }
    var expandedReason by remember { mutableStateOf(false) }
    var selectedReason by remember { mutableStateOf("PEMBELIAN") }
    val reasons = listOf("PEMBELIAN", "PENJUALAN", "RETUR", "KERUSAKAN", "KOREKSI", "LAINNYA")

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Sesuaikan Stok", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                TextButton(onClick = onDismiss) { Text("Batal") }
            }
            Text("${product.nama} · Stok: ${product.stok}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)

            // Delta stepper
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    FilledIconButton(onClick = { stockDelta-- }, colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color(0xFFEF4444))) {
                        Icon(Icons.Default.Remove, null, tint = Color.White)
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(if (stockDelta >= 0) "+$stockDelta" else "$stockDelta", fontWeight = FontWeight.ExtraBold, fontSize = 32.sp,
                            color = if (stockDelta >= 0) Color(0xFF22C55E) else Color(0xFFEF4444))
                        Text("Perubahan", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (stockDelta != 0) Text("→ ${product.stok + stockDelta} unit", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.primary)
                    }
                    FilledIconButton(onClick = { stockDelta++ }, colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color(0xFF22C55E))) {
                        Icon(Icons.Default.Add, null, tint = Color.White)
                    }
                }
            }

            ExposedDropdownMenuBox(expanded = expandedReason, onExpandedChange = { expandedReason = !expandedReason }) {
                OutlinedTextField(value = selectedReason, onValueChange = {}, readOnly = true, label = { Text("Alasan") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedReason) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(), shape = RoundedCornerShape(20.dp))
                ExposedDropdownMenu(expanded = expandedReason, onDismissRequest = { expandedReason = false }) {
                    reasons.forEach { r -> DropdownMenuItem(text = { Text(r) }, onClick = { selectedReason = r; expandedReason = false }) }
                }
            }
            OutlinedTextField(value = reason, onValueChange = { reason = it }, label = { Text("Keterangan (opsional)") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), minLines = 2)

            Button(onClick = { if (stockDelta != 0) { viewModel.adjustStock(product.id, stockDelta, selectedReason, reason.ifBlank { null }); onDismiss() } },
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(20.dp), enabled = stockDelta != 0) {
                Text("Simpan Penyesuaian", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProductSheet(product: Product, viewModel: AppViewModel, onDismiss: () -> Unit) {
    var nama by remember { mutableStateOf(product.nama) }
    var hargaBeli by remember { mutableStateOf(product.hargaBeli.toInt().toString()) }
    var hargaJual by remember { mutableStateOf(product.hargaJual.toInt().toString()) }
    var minStok by remember { mutableStateOf(product.minStok.toString()) }
    var fotoUrl by remember { mutableStateOf(product.foto) }

    val imagePickerLauncher = rememberImagePickerLauncher { uri -> fotoUrl = uri }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Edit Produk", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                TextButton(onClick = onDismiss) { Text("Batal") }
            }

            // Photo picker
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(72.dp).clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surfaceVariant)) {
                    if (!fotoUrl.isNullOrBlank()) {
                        AsyncImage(model = fotoUrl, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    } else {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.CameraAlt, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    OutlinedButton(onClick = { imagePickerLauncher() }, shape = RoundedCornerShape(10.dp)) { Text("Ganti Foto") }
                    if (!fotoUrl.isNullOrBlank()) {
                        TextButton(onClick = { fotoUrl = null }, contentPadding = PaddingValues(0.dp)) { Text("Hapus", color = Color(0xFFEF4444), fontSize = 12.sp) }
                    }
                }
            }

            OutlinedTextField(value = nama, onValueChange = { nama = it }, label = { Text("Nama Produk") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = hargaBeli, onValueChange = { hargaBeli = it }, label = { Text("Harga Beli") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), singleLine = true, prefix = { Text("Rp ") })
                OutlinedTextField(value = hargaJual, onValueChange = { hargaJual = it }, label = { Text("Harga Jual") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), singleLine = true, prefix = { Text("Rp ") })
            }
            OutlinedTextField(value = minStok, onValueChange = { minStok = it }, label = { Text("Min Stok Alert") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true)

            Button(
                onClick = {
                    val updated = product.copy(nama = nama, hargaBeli = hargaBeli.toDoubleOrNull() ?: product.hargaBeli, hargaJual = hargaJual.toDoubleOrNull() ?: product.hargaJual, minStok = minStok.toIntOrNull() ?: product.minStok, foto = fotoUrl)
                    viewModel.updateProduct(updated)
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(20.dp), enabled = nama.isNotBlank()
            ) { Text("Simpan Perubahan", fontSize = 16.sp, fontWeight = FontWeight.Bold) }
            Spacer(Modifier.height(24.dp))
        }
    }
}
