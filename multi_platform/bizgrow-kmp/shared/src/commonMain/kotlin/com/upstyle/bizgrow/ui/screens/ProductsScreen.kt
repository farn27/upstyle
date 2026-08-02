package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductsScreen(viewModel: AppViewModel) {
    val products by viewModel.products.collectAsStateWithLifecycle()
    val lowStockProducts by viewModel.lowStockProducts.collectAsStateWithLifecycle()
    val kategoriList by viewModel.kategoriProduk.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var showSearch by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var filterType by remember { mutableStateOf("Semua") }
    var showAddProductSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadProducts()
        viewModel.loadKategoriProduk()
    }

    val filteredProducts = products.filter {
        val matchesSearch = it.nama.contains(searchQuery, ignoreCase = true) ||
                it.sku.contains(searchQuery, ignoreCase = true) ||
                (it.barcode?.contains(searchQuery, ignoreCase = true) ?: false)
        val matchesFilter = when (filterType) {
            "Low Stock" -> it.stok in 1..it.minStok
            "Habis" -> it.stok == 0
            else -> true
        }
        matchesSearch && matchesFilter
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Produk", fontWeight = FontWeight.Bold)
                        Text("${products.size} item", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Dashboard")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        showSearch = !showSearch
                        if (!showSearch) searchQuery = ""
                    }) {
                        Icon(if (showSearch) Icons.Default.Close else Icons.Default.Search, null)
                    }
                    IconButton(onClick = { viewModel.navigate(Screen.StockLogs) }) {
                        Icon(Icons.Default.History, contentDescription = "Riwayat Stok")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddProductSheet = true },
                containerColor = MaterialTheme.colorScheme.primary,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Produk", tint = Color.White)
            }
        }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            AnimatedVisibility(visible = showSearch) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Cari produk, SKU, barcode...") },
                    leadingIcon = { Icon(Icons.Default.Search, null) },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Default.Close, null) }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )
            }

            // Stats + filter row
            Surface(color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    listOf(
                        Triple("Semua", products.size, MaterialTheme.colorScheme.primary),
                        Triple("Low Stock", lowStockProducts.size, Color(0xFFEF6C00)),
                        Triple("Habis", products.count { it.stok == 0 }, Color(0xFFC62828))
                    ).forEach { (label, count, color) ->
                        FilterChip(
                            selected = filterType == label,
                            onClick = { filterType = label },
                            label = {
                                Text("$label ($count)", fontSize = 12.sp)
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = color.copy(alpha = 0.15f),
                                selectedLabelColor = color
                            )
                        )
                    }
                }
            }

            if (uiState.isLoading && products.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (filteredProducts.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Inventory2, null, Modifier.size(56.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
                        Text(if (searchQuery.isNotEmpty()) "Tidak ada hasil untuk \"$searchQuery\"" else "Belum ada produk", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredProducts, key = { it.id }) { product ->
                        ProductItemCard(product = product, onClick = { viewModel.navigate(Screen.ProdukDetail(product.id)) })
                    }
                    item { Spacer(Modifier.height(80.dp)) }
                }
            }
        }

        if (showAddProductSheet) {
            ModalBottomSheet(
                onDismissRequest = { showAddProductSheet = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
            ) {
                AddProductForm(
                    kategoriList = kategoriList,
                    onDismiss = { showAddProductSheet = false },
                    onSubmit = { nama, hargaBeli, hargaJual, stok, minStok, sku, barcode, kategoriId, fotoUri ->
                        viewModel.addProduct(nama, hargaBeli, hargaJual, stok, minStok, sku, barcode, kategoriId, fotoUri) { success ->
                            if (success) showAddProductSheet = false
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun ProductItemCard(product: Product, onClick: () -> Unit) {
    val isLowStock = product.stok in 1..product.minStok
    val isHabis = product.stok == 0

    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Product image
            AsyncImage(
                model = product.foto?.takeIf { it.isNotBlank() }
                    ?: "https://ui-avatars.com/api/?name=${product.nama.take(2)}&background=E8E8FF&color=4338CA&size=128",
                contentDescription = product.nama,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(60.dp).clip(RoundedCornerShape(10.dp))
            )
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(product.nama, fontWeight = FontWeight.SemiBold, maxLines = 1, fontSize = 14.sp)
                Text(
                    if (product.sku.isNotBlank()) "SKU: ${product.sku}" else "Tanpa SKU",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (product.kategori.isNotBlank()) {
                        Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(4.dp)) {
                            Text(product.kategori, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), color = MaterialTheme.colorScheme.primary)
                        }
                    }
                    if (isHabis) {
                        Surface(color = Color(0xFFFFCDD2), shape = RoundedCornerShape(4.dp)) {
                            Text("HABIS", fontSize = 9.sp, color = Color(0xFFC62828), modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp), fontWeight = FontWeight.Bold)
                        }
                    } else if (isLowStock) {
                        Surface(color = Color(0xFFFFE0B2), shape = RoundedCornerShape(4.dp)) {
                            Text("LOW", fontSize = 9.sp, color = Color(0xFFEF6C00), modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    "Rp ${"%,.0f".format(product.hargaJual.toDouble())}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.primary
                )
                val stockColor = when {
                    isHabis -> Color(0xFFC62828)
                    isLowStock -> Color(0xFFEF6C00)
                    else -> Color(0xFF2E7D32)
                }
                Text(
                    "${product.stok} stok",
                    color = stockColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddProductForm(
    kategoriList: List<KategoriProduk>,
    onDismiss: () -> Unit,
    onSubmit: (nama: String, hargaBeli: Double, hargaJual: Double, stok: Int, minStok: Int, sku: String, barcode: String?, kategoriId: Int?, fotoUri: String?) -> Unit
) {
    var nama by remember { mutableStateOf("") }
    var hargaBeli by remember { mutableStateOf("") }
    var hargaJual by remember { mutableStateOf("") }
    var stok by remember { mutableStateOf("0") }
    var minStok by remember { mutableStateOf("5") }
    var sku by remember { mutableStateOf("") }
    var barcode by remember { mutableStateOf("") }
    var selectedKategoriId by remember { mutableStateOf<Int?>(null) }
    var expandedKategori by remember { mutableStateOf(false) }
    var fotoUrl by remember { mutableStateOf<String?>(null) }

    // Image picker via ActivityResultLauncher
    val imagePickerLauncher = rememberImagePickerLauncher { uri ->
        fotoUrl = uri
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text("Produk Baru", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            TextButton(onClick = onDismiss) { Text("Batal") }
        }

        // Photo picker
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                modifier = Modifier.size(80.dp).clickable { imagePickerLauncher() },
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    if (fotoUrl != null) {
                        AsyncImage(
                            model = fotoUrl,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp))
                        )
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.CameraAlt, null, Modifier.size(24.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("Foto", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
            Column {
                Text("Foto Produk", fontWeight = FontWeight.Medium)
                Text("Opsional · Tap untuk pilih foto", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (fotoUrl != null) {
                    TextButton(onClick = { fotoUrl = null }, contentPadding = PaddingValues(0.dp)) {
                        Text("Hapus foto", fontSize = 12.sp, color = Color(0xFFC62828))
                    }
                }
            }
        }

        HorizontalDivider()

        OutlinedTextField(
            value = nama, onValueChange = { nama = it },
            label = { Text("Nama Produk *") },
            leadingIcon = { Icon(Icons.Default.Inventory, null) },
            modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = hargaBeli, onValueChange = { hargaBeli = it },
                label = { Text("Harga Beli") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), singleLine = true,
                prefix = { Text("Rp ", fontSize = 12.sp) }
            )
            OutlinedTextField(
                value = hargaJual, onValueChange = { hargaJual = it },
                label = { Text("Harga Jual *") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), singleLine = true,
                prefix = { Text("Rp ", fontSize = 12.sp) }
            )
        }

        // Margin indicator
        val hBeliVal = hargaBeli.toDoubleOrNull() ?: 0.0
        val hJualVal = hargaJual.toDoubleOrNull() ?: 0.0
        if (hBeliVal > 0 && hJualVal > 0) {
            val margin = ((hJualVal - hBeliVal) / hBeliVal * 100).toInt()
            val marginColor = if (margin >= 0) Color(0xFF2E7D32) else Color(0xFFC62828)
            Surface(color = marginColor.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
                Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Margin keuntungan", fontSize = 13.sp)
                    Text("$margin%", fontWeight = FontWeight.Bold, color = marginColor)
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = stok, onValueChange = { stok = it },
                label = { Text("Stok Awal") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), singleLine = true
            )
            OutlinedTextField(
                value = minStok, onValueChange = { minStok = it },
                label = { Text("Min Stok") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), singleLine = true
            )
        }

        OutlinedTextField(
            value = sku, onValueChange = { sku = it },
            label = { Text("SKU") },
            leadingIcon = { Icon(Icons.Default.Tag, null) },
            modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true
        )

        OutlinedTextField(
            value = barcode, onValueChange = { barcode = it },
            label = { Text("Barcode (opsional)") },
            leadingIcon = { Icon(Icons.Default.QrCode, null) },
            modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true
        )

        if (kategoriList.isNotEmpty()) {
            ExposedDropdownMenuBox(expanded = expandedKategori, onExpandedChange = { expandedKategori = !expandedKategori }) {
                OutlinedTextField(
                    value = kategoriList.firstOrNull { it.id == selectedKategoriId }?.namaKategori ?: "Pilih Kategori (opsional)",
                    onValueChange = {}, readOnly = true,
                    label = { Text("Kategori") },
                    leadingIcon = { Icon(Icons.Default.Category, null) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedKategori) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(), shape = RoundedCornerShape(12.dp)
                )
                ExposedDropdownMenu(expanded = expandedKategori, onDismissRequest = { expandedKategori = false }) {
                    DropdownMenuItem(text = { Text("Tanpa Kategori") }, onClick = { selectedKategoriId = null; expandedKategori = false })
                    kategoriList.forEach { k ->
                        DropdownMenuItem(text = { Text(k.namaKategori) }, onClick = { selectedKategoriId = k.id; expandedKategori = false })
                    }
                }
            }
        }

        Button(
            onClick = {
                if (nama.isNotBlank() && hargaJual.isNotBlank()) {
                    onSubmit(
                        nama,
                        hargaBeli.toDoubleOrNull() ?: 0.0,
                        hargaJual.toDoubleOrNull() ?: 0.0,
                        stok.toIntOrNull() ?: 0,
                        minStok.toIntOrNull() ?: 5,
                        sku,
                        barcode.ifBlank { null },
                        selectedKategoriId,
                        fotoUrl
                    )
                }
            },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp),
            enabled = nama.isNotBlank() && hargaJual.isNotBlank()
        ) {
            Icon(Icons.Default.Save, null)
            Spacer(Modifier.width(8.dp))
            Text("Simpan Produk", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(24.dp))
    }
}

// Expect/actual for image picker — platform specific
@androidx.compose.runtime.Composable
expect fun rememberImagePickerLauncher(onImageSelected: (String?) -> Unit): () -> Unit
