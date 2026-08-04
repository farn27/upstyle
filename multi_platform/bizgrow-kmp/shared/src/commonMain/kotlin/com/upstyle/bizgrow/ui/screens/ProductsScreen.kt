package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
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
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductsScreen(viewModel: AppViewModel) {
    val products by viewModel.products.collectAsState()
    val lowStockProducts by viewModel.lowStockProducts.collectAsState()
    val kategoriList by viewModel.kategoriProduk.collectAsState()
    val uiState by viewModel.uiState.collectAsState()

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
            "Habis" -> it.stok <= 0
            else -> true
        }
        matchesSearch && matchesFilter
    }

    Scaffold(
        containerColor = BizgrowColors.Background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Inventaris Produk", fontWeight = FontWeight.Black, color = BizgrowColors.Gray950, fontSize = 20.sp)
                        Text("${products.size} Total Item", fontSize = 12.sp, color = BizgrowColors.Gray500, fontWeight = FontWeight.Medium)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = BizgrowColors.Gray900)
                    }
                },
                actions = {
                    IconButton(onClick = {
                        showSearch = !showSearch
                        if (!showSearch) searchQuery = ""
                    }) {
                        Icon(if (showSearch) Icons.Default.Close else Icons.Default.Search, null, tint = BizgrowColors.Gray900)
                    }
                    IconButton(onClick = { viewModel.navigate(Screen.StockLogs) }) {
                        Icon(Icons.Default.History, "Riwayat Stok", tint = BizgrowColors.Gray900)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BizgrowColors.Surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddProductSheet = true },
                containerColor = BizgrowColors.Primary,
                contentColor = BizgrowColors.White,
                shape = RoundedCornerShape(20.dp),
                elevation = FloatingActionButtonDefaults.elevation(2.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Produk")
            }
        }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            AnimatedVisibility(visible = showSearch) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Cari produk, SKU, barcode...", color = BizgrowColors.Gray400) },
                    leadingIcon = { Icon(Icons.Default.Search, null, tint = BizgrowColors.Gray400) },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Default.Close, null, tint = BizgrowColors.Gray400) }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(20.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BizgrowColors.Primary,
                        unfocusedBorderColor = BizgrowColors.Gray200,
                        focusedContainerColor = BizgrowColors.White,
                        unfocusedContainerColor = BizgrowColors.White
                    )
                )
            }

            // Stats + filter row
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                listOf(
                    Triple("Semua", products.size, BizgrowColors.Primary),
                    Triple("Low Stock", lowStockProducts.size, BizgrowColors.Warning),
                    Triple("Habis", products.count { it.stok <= 0 }, BizgrowColors.Danger)
                ).forEach { (label, count, color) ->
                    val isSelected = filterType == label
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) color else BizgrowColors.White,
                        contentColor = if (isSelected) BizgrowColors.White else BizgrowColors.Gray700,
                        border = if (!isSelected) BorderStroke(1.dp, BizgrowColors.Gray200) else null,
                        modifier = Modifier.clickable { filterType = label }
                    ) {
                        Text(
                            text = "$label ($count)",
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 13.sp
                        )
                    }
                }
            }

            if (uiState.isLoading && products.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BizgrowColors.Primary)
                }
            } else if (filteredProducts.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Default.Inventory2, null, Modifier.size(64.dp), tint = BizgrowColors.Gray300)
                        Text(if (searchQuery.isNotEmpty()) "Tidak ada hasil untuk \"$searchQuery\"" else "Belum ada produk", color = BizgrowColors.Gray500, fontWeight = FontWeight.Medium)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
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
                containerColor = BizgrowColors.Surface,
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
    val isHabis = product.stok <= 0

    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Product image
            AsyncImage(
                model = product.foto?.takeIf { it.isNotBlank() } ?: "https://ui-avatars.com/api/?name=${product.nama.take(2)}&background=EFF0FE&color=5B5FEF&size=128",
                contentDescription = product.nama,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(64.dp).clip(RoundedCornerShape(20.dp))
            )
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(product.nama, fontWeight = FontWeight.Bold, maxLines = 1, fontSize = 15.sp, color = BizgrowColors.Gray950)
                Text(
                    if (product.sku.isNotBlank()) "SKU: ${product.sku}" else "Tanpa SKU",
                    fontSize = 12.sp,
                    color = BizgrowColors.Gray500
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (product.kategori.isNotBlank()) {
                        Surface(color = BizgrowColors.PrimaryLight, shape = RoundedCornerShape(6.dp)) {
                            Text(product.kategori, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), color = BizgrowColors.Primary, fontWeight = FontWeight.Bold)
                        }
                    }
                    if (isHabis) {
                        Surface(color = BizgrowColors.DangerLight, shape = RoundedCornerShape(6.dp)) {
                            Text("HABIS", fontSize = 10.sp, color = BizgrowColors.Danger, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontWeight = FontWeight.Bold)
                        }
                    } else if (isLowStock) {
                        Surface(color = BizgrowColors.WarningLight, shape = RoundedCornerShape(6.dp)) {
                            Text("LOW", fontSize = 10.sp, color = BizgrowColors.Warning, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    "Rp ${"%,.0f".format(product.hargaJual.toDouble())}",
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp,
                    color = BizgrowColors.Primary
                )
                val stockColor = when {
                    isHabis -> BizgrowColors.Danger
                    isLowStock -> BizgrowColors.Warning
                    else -> BizgrowColors.Success
                }
                Text(
                    "${product.stok} stok",
                    color = stockColor,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
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

    val imagePickerLauncher = rememberImagePickerLauncher { uri -> fotoUrl = uri }

    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text("Produk Baru", fontSize = 20.sp, fontWeight = FontWeight.Black, color = BizgrowColors.Gray950)
            TextButton(onClick = onDismiss) { Text("Batal", color = BizgrowColors.Gray500, fontWeight = FontWeight.Bold) }
        }

        // Photo picker
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                modifier = Modifier.size(80.dp).clickable { imagePickerLauncher() },
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = BizgrowColors.Gray100)
            ) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    if (fotoUrl != null) {
                        AsyncImage(model = fotoUrl, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(20.dp)))
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.CameraAlt, null, Modifier.size(24.dp), tint = BizgrowColors.Gray500)
                            Spacer(Modifier.height(4.dp))
                            Text("Foto", fontSize = 10.sp, color = BizgrowColors.Gray500, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            Column {
                Text("Foto Produk", fontWeight = FontWeight.Bold, color = BizgrowColors.Gray900)
                Text("Opsional · Tap untuk pilih foto", fontSize = 12.sp, color = BizgrowColors.Gray500)
                if (fotoUrl != null) {
                    TextButton(onClick = { fotoUrl = null }, contentPadding = PaddingValues(0.dp)) {
                        Text("Hapus foto", fontSize = 12.sp, color = BizgrowColors.Danger, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        HorizontalDivider(color = BizgrowColors.Gray200)

        OutlinedTextField(
            value = nama, onValueChange = { nama = it },
            label = { Text("Nama Produk *") },
            leadingIcon = { Icon(Icons.Default.Inventory, null, tint = BizgrowColors.Gray400) },
            modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300)
        )

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = hargaBeli, onValueChange = { hargaBeli = it },
                label = { Text("Harga Beli") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), singleLine = true,
                prefix = { Text("Rp ", fontSize = 12.sp) },
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300)
            )
            OutlinedTextField(
                value = hargaJual, onValueChange = { hargaJual = it },
                label = { Text("Harga Jual *") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), singleLine = true,
                prefix = { Text("Rp ", fontSize = 12.sp) },
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300)
            )
        }

        val hBeliVal = hargaBeli.toDoubleOrNull() ?: 0.0
        val hJualVal = hargaJual.toDoubleOrNull() ?: 0.0
        if (hBeliVal > 0 && hJualVal > 0) {
            val margin = ((hJualVal - hBeliVal) / hBeliVal * 100).toInt()
            val marginColor = if (margin >= 0) BizgrowColors.Success else BizgrowColors.Danger
            Surface(color = marginColor.copy(alpha = 0.1f), shape = RoundedCornerShape(12.dp)) {
                Row(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Margin keuntungan", fontSize = 13.sp, color = BizgrowColors.Gray700, fontWeight = FontWeight.Medium)
                    Text("$margin%", fontWeight = FontWeight.Black, color = marginColor)
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = stok, onValueChange = { stok = it },
                label = { Text("Stok Awal") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300)
            )
            OutlinedTextField(
                value = minStok, onValueChange = { minStok = it },
                label = { Text("Min Stok") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300)
            )
        }

        OutlinedTextField(
            value = sku, onValueChange = { sku = it },
            label = { Text("SKU") },
            leadingIcon = { Icon(Icons.Default.Tag, null, tint = BizgrowColors.Gray400) },
            modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300)
        )

        if (kategoriList.isNotEmpty()) {
            ExposedDropdownMenuBox(expanded = expandedKategori, onExpandedChange = { expandedKategori = !expandedKategori }) {
                OutlinedTextField(
                    value = kategoriList.firstOrNull { it.id == selectedKategoriId }?.namaKategori ?: "Pilih Kategori (opsional)",
                    onValueChange = {}, readOnly = true,
                    label = { Text("Kategori") },
                    leadingIcon = { Icon(Icons.Default.Category, null, tint = BizgrowColors.Gray400) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedKategori) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(), shape = RoundedCornerShape(20.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300)
                )
                ExposedDropdownMenu(expanded = expandedKategori, onDismissRequest = { expandedKategori = false }) {
                    DropdownMenuItem(text = { Text("Tanpa Kategori") }, onClick = { selectedKategoriId = null; expandedKategori = false })
                    kategoriList.forEach { k -> DropdownMenuItem(text = { Text(k.namaKategori) }, onClick = { selectedKategoriId = k.id; expandedKategori = false }) }
                }
            }
        }

        Button(
            onClick = {
                if (nama.isNotBlank() && hargaJual.isNotBlank()) {
                    onSubmit(nama, hargaBeli.toDoubleOrNull() ?: 0.0, hargaJual.toDoubleOrNull() ?: 0.0, stok.toIntOrNull() ?: 0, minStok.toIntOrNull() ?: 5, sku, barcode.ifBlank { null }, selectedKategoriId, fotoUrl)
                }
            },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(20.dp),
            colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary),
            enabled = nama.isNotBlank() && hargaJual.isNotBlank()
        ) {
            Icon(Icons.Default.Save, null, tint = BizgrowColors.White)
            Spacer(Modifier.width(8.dp))
            Text("Simpan Produk", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = BizgrowColors.White)
        }
        Spacer(Modifier.height(32.dp))
    }
}

@androidx.compose.runtime.Composable
expect fun rememberImagePickerLauncher(onImageSelected: (String?) -> Unit): () -> Unit
