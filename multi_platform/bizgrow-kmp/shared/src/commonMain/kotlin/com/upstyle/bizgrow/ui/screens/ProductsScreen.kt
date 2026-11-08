package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
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
import com.upstyle.bizgrow.ui.design.ProductThumb
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.theme.BizgrowColors

// ─────────────────────────────────────────────────────────────────────────────
// ProductsScreen
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ProductsScreen(viewModel: AppViewModel) {
    val products by viewModel.products.collectAsState(initial = viewModel.products.value)
    val lowStockProducts by viewModel.lowStockProducts.collectAsState(initial = viewModel.lowStockProducts.value)
    val kategoriList by viewModel.kategoriProduk.collectAsState(initial = viewModel.kategoriProduk.value)
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    val variantsState by viewModel.productVariantsState.collectAsState()
    val bulkOpState by viewModel.bulkOperationState.collectAsState()

    // ── Basic UI state ────────────────────────────────────────────────────────
    var showSearch by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var filterType by remember { mutableStateOf("Semua") }
    var showAddProductSheet by remember { mutableStateOf(false) }

    // ── Multi-select state ────────────────────────────────────────────────────
    var isMultiSelectMode by remember { mutableStateOf(false) }
    var selectedProductIds by remember { mutableStateOf(setOf<String>()) }

    // ── Variant expansion state ───────────────────────────────────────────────
    var expandedVariantProductIds by remember { mutableStateOf(setOf<String>()) }

    // ── Advanced filter state ─────────────────────────────────────────────────
    var showAdvancedFilter by remember { mutableStateOf(false) }
    var filterPriceMin by remember { mutableStateOf(0f) }
    var filterPriceMax by remember { mutableStateOf(10_000_000f) }
    var filterStockMin by remember { mutableStateOf(0f) }
    var filterStockMax by remember { mutableStateOf(1000f) }
    var filterKategoriId by remember { mutableStateOf<Int?>(null) }
    var advancedFilterActive by remember { mutableStateOf(false) }

    // ── Bulk operation progress sheet ─────────────────────────────────────────
    var showBulkProgressSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadProducts()
        viewModel.loadKategoriProduk()
    }

    // Show bulk progress sheet when a bulk op completes
    LaunchedEffect(bulkOpState.currentResult) {
        if (bulkOpState.currentResult != null) showBulkProgressSheet = true
    }

    // ── Filtering ─────────────────────────────────────────────────────────────
    val filteredProducts = products.filter { product ->
        val matchesSearch = product.nama.contains(searchQuery, ignoreCase = true) ||
                product.sku.contains(searchQuery, ignoreCase = true) ||
                (product.barcode?.contains(searchQuery, ignoreCase = true) ?: false)
        val matchesQuickFilter = when (filterType) {
            "Low Stock" -> product.stok in 1..product.minStok
            "Habis" -> product.stok <= 0
            else -> true
        }
        val matchesAdvanced = if (advancedFilterActive) {
            product.hargaJual >= filterPriceMin && product.hargaJual <= filterPriceMax &&
                    product.stok >= filterStockMin.toInt() && product.stok <= filterStockMax.toInt() &&
                    (filterKategoriId == null || product.kategoriId == filterKategoriId)
        } else true

        matchesSearch && matchesQuickFilter && matchesAdvanced
    }

    Scaffold(
        containerColor = BizgrowColors.Background,
        topBar = {
            TopAppBar(
                title = {
                    if (isMultiSelectMode) {
                        Text(
                            "${selectedProductIds.size} dipilih",
                            fontWeight = FontWeight.Black,
                            color = BizgrowColors.Primary,
                            fontSize = 20.sp
                        )
                    } else {
                        Column {
                            Text(
                                "Inventaris Produk",
                                fontWeight = FontWeight.Black,
                                color = BizgrowColors.Gray950,
                                fontSize = 20.sp
                            )
                            Text(
                                "${products.size} Total Item",
                                fontSize = 12.sp,
                                color = BizgrowColors.Gray500,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                },
                navigationIcon = {
                    if (isMultiSelectMode) {
                        IconButton(onClick = {
                            isMultiSelectMode = false
                            selectedProductIds = emptySet()
                        }) {
                            Icon(Icons.Default.Close, contentDescription = "Batal Pilih", tint = BizgrowColors.Gray900)
                        }
                    } else {
                        IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = BizgrowColors.Gray900)
                        }
                    }
                },
                actions = {
                    if (!isMultiSelectMode) {
                        IconButton(onClick = {
                            showSearch = !showSearch
                            if (!showSearch) searchQuery = ""
                        }) {
                            Icon(
                                if (showSearch) Icons.Default.Close else Icons.Default.Search,
                                null,
                                tint = BizgrowColors.Gray900
                            )
                        }
                        // Advanced filter button — badge when active
                        BadgedBox(
                            badge = {
                                if (advancedFilterActive) Badge(containerColor = BizgrowColors.Primary)
                            }
                        ) {
                            IconButton(onClick = { showAdvancedFilter = true }) {
                                Icon(Icons.Default.FilterList, "Filter Lanjutan", tint = BizgrowColors.Gray900)
                            }
                        }
                        IconButton(onClick = { viewModel.navigate(Screen.StockLogs) }) {
                            Icon(Icons.Default.History, "Riwayat Stok", tint = BizgrowColors.Gray900)
                        }
                        // More menu
                        var showMenu by remember { mutableStateOf(false) }
                        Box {
                            IconButton(onClick = { showMenu = true }) {
                                Icon(Icons.Default.MoreVert, null, tint = BizgrowColors.Gray900)
                            }
                            DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                                DropdownMenuItem(
                                    text = { Text("Kategori Produk") },
                                    leadingIcon = { Icon(Icons.Default.Category, null) },
                                    onClick = { viewModel.navigate(Screen.Cs); showMenu = false }
                                )
                                DropdownMenuItem(
                                    text = { Text("Stok Opname") },
                                    leadingIcon = { Icon(Icons.Default.Inventory2, null) },
                                    onClick = { viewModel.navigate(Screen.StockOpname); showMenu = false }
                                )
                                DropdownMenuItem(
                                    text = { Text("Pricing Massal") },
                                    leadingIcon = { Icon(Icons.Default.PriceChange, null) },
                                    onClick = { viewModel.navigate(Screen.Pricing); showMenu = false }
                                )
                                DropdownMenuItem(
                                    text = { Text("Kategori Produk") },
                                    leadingIcon = { Icon(Icons.Default.Category, null) },
                                    onClick = { viewModel.navigate(Screen.KategoriProduk); showMenu = false }
                                )
                                DropdownMenuItem(
                                    text = { Text("Sampah Produk") },
                                    leadingIcon = { Icon(Icons.Default.Delete, null) },
                                    onClick = { viewModel.navigate(Screen.TrashProducts); showMenu = false }
                                )
                            }
                        }
                    } else {
                        // Select-all when in multi-select mode
                        val allSelected = filteredProducts.all { it.id in selectedProductIds }
                        IconButton(onClick = {
                            selectedProductIds = if (allSelected) emptySet()
                            else filteredProducts.map { it.id }.toSet()
                        }) {
                            Icon(
                                if (allSelected) Icons.Default.CheckBox else Icons.Default.CheckBoxOutlineBlank,
                                "Pilih Semua",
                                tint = BizgrowColors.Primary
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BizgrowColors.Surface)
            )
        },
        floatingActionButton = {
            if (!isMultiSelectMode) {
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
        },
        // ── Bulk action bar ───────────────────────────────────────────────────
        bottomBar = {
            AnimatedVisibility(visible = isMultiSelectMode && selectedProductIds.isNotEmpty()) {
                BottomAppBar(
                    containerColor = BizgrowColors.Surface,
                    contentColor = BizgrowColors.Gray900,
                    tonalElevation = 8.dp
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Update Harga
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    viewModel.bulkUpdateProducts(
                                        selectedProductIds.toList(),
                                        "PRICE_UPDATE"
                                    )
                                    isMultiSelectMode = false
                                    selectedProductIds = emptySet()
                                }
                                .padding(8.dp)
                        ) {
                            Icon(Icons.Default.PriceChange, null, tint = BizgrowColors.Primary, modifier = Modifier.size(24.dp))
                            Spacer(Modifier.height(2.dp))
                            Text("Update Harga", fontSize = 10.sp, fontWeight = FontWeight.Medium, color = BizgrowColors.Primary)
                        }
                        // Arsip
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    viewModel.bulkUpdateProducts(
                                        selectedProductIds.toList(),
                                        "ARCHIVE"
                                    )
                                    isMultiSelectMode = false
                                    selectedProductIds = emptySet()
                                }
                                .padding(8.dp)
                        ) {
                            Icon(Icons.Default.Archive, null, tint = BizgrowColors.Warning, modifier = Modifier.size(24.dp))
                            Spacer(Modifier.height(2.dp))
                            Text("Arsip", fontSize = 10.sp, fontWeight = FontWeight.Medium, color = BizgrowColors.Warning)
                        }
                        // Hapus
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    viewModel.bulkUpdateProducts(
                                        selectedProductIds.toList(),
                                        "DELETE"
                                    )
                                    isMultiSelectMode = false
                                    selectedProductIds = emptySet()
                                }
                                .padding(8.dp)
                        ) {
                            Icon(Icons.Default.Delete, null, tint = BizgrowColors.Danger, modifier = Modifier.size(24.dp))
                            Spacer(Modifier.height(2.dp))
                            Text("Hapus", fontSize = 10.sp, fontWeight = FontWeight.Medium, color = BizgrowColors.Danger)
                        }
                        // Cancel
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    isMultiSelectMode = false
                                    selectedProductIds = emptySet()
                                }
                                .padding(8.dp)
                        ) {
                            Icon(Icons.Default.Close, null, tint = BizgrowColors.Gray600, modifier = Modifier.size(24.dp))
                            Spacer(Modifier.height(2.dp))
                            Text("Batal", fontSize = 10.sp, fontWeight = FontWeight.Medium, color = BizgrowColors.Gray600)
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            // ── Search bar ────────────────────────────────────────────────────
            AnimatedVisibility(visible = showSearch) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Cari produk, SKU, barcode...", color = BizgrowColors.Gray400) },
                    leadingIcon = { Icon(Icons.Default.Search, null, tint = BizgrowColors.Gray400) },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Default.Close, null, tint = BizgrowColors.Gray400)
                            }
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

            // ── Advanced filter active indicator ──────────────────────────────
            AnimatedVisibility(visible = advancedFilterActive) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp)
                        .padding(bottom = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = BizgrowColors.PrimaryLight,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.FilterList, null, modifier = Modifier.size(14.dp), tint = BizgrowColors.Primary)
                            Text("Filter aktif", fontSize = 11.sp, color = BizgrowColors.Primary, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.width(4.dp))
                            Icon(
                                Icons.Default.Close,
                                "Hapus Filter",
                                modifier = Modifier.size(14.dp).clickable {
                                    advancedFilterActive = false
                                    filterPriceMin = 0f
                                    filterPriceMax = 10_000_000f
                                    filterStockMin = 0f
                                    filterStockMax = 1000f
                                    filterKategoriId = null
                                },
                                tint = BizgrowColors.Primary
                            )
                        }
                    }
                }
            }

            // ── Quick filter chips ────────────────────────────────────────────
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

            // ── Content ───────────────────────────────────────────────────────
            if (uiState.isLoading && products.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BizgrowColors.Primary)
                }
            } else if (filteredProducts.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(Icons.Default.Inventory2, null, Modifier.size(64.dp), tint = BizgrowColors.Gray300)
                        Text(
                            if (searchQuery.isNotEmpty()) "Tidak ada hasil untuk \"$searchQuery\""
                            else "Belum ada produk",
                            color = BizgrowColors.Gray500,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredProducts, key = { it.id }) { product ->
                        val isSelected = product.id in selectedProductIds
                        val variantsForProduct = variantsState.variantsByProduct[product.id] ?: emptyList()
                        val isExpanded = product.id in expandedVariantProductIds

                        ProductItemCardWithVariants(
                            product = product,
                            isSelected = isSelected,
                            isMultiSelectMode = isMultiSelectMode,
                            isExpanded = isExpanded,
                            variants = variantsForProduct,
                            variantsLoading = variantsState.isLoading,
                            onToggleSelect = {
                                selectedProductIds = if (isSelected) {
                                    selectedProductIds - product.id
                                } else {
                                    selectedProductIds + product.id
                                }
                                if (selectedProductIds.isEmpty()) isMultiSelectMode = false
                            },
                            onLongPress = {
                                isMultiSelectMode = true
                                selectedProductIds = selectedProductIds + product.id
                            },
                            onExpandVariants = {
                                if (isExpanded) {
                                    expandedVariantProductIds = expandedVariantProductIds - product.id
                                } else {
                                    expandedVariantProductIds = expandedVariantProductIds + product.id
                                    if (variantsForProduct.isEmpty()) {
                                        viewModel.loadProductVariants(product.id)
                                    }
                                }
                            },
                            onClick = {
                                if (isMultiSelectMode) {
                                    selectedProductIds = if (isSelected) {
                                        selectedProductIds - product.id
                                    } else {
                                        selectedProductIds + product.id
                                    }
                                    if (selectedProductIds.isEmpty()) isMultiSelectMode = false
                                } else {
                                    viewModel.navigate(Screen.ProdukDetail(product.id))
                                }
                            },
                            onStockMovement = { viewModel.navigate(Screen.StockMovement(product.id)) },
                            onPricingStrategy = { viewModel.navigate(Screen.PricingStrategy(product.id)) }
                        )
                    }
                    item { Spacer(Modifier.height(80.dp)) }
                }
            }
        }

        // ── Tambah produk (form lengkap: jenis, kategori, barcode, varian, foto) ──
        if (showAddProductSheet) {
            ProdukFormSheet(viewModel, null, kategoriList, onDismiss = { showAddProductSheet = false })
        }

        // ── Advanced filter bottom sheet ──────────────────────────────────────
        if (showAdvancedFilter) {
            AdvancedProductFilterSheet(
                kategoriList = kategoriList,
                priceMin = filterPriceMin,
                priceMax = filterPriceMax,
                stockMin = filterStockMin,
                stockMax = filterStockMax,
                selectedKategoriId = filterKategoriId,
                onDismiss = { showAdvancedFilter = false },
                onApply = { pMin, pMax, sMin, sMax, katId ->
                    filterPriceMin = pMin
                    filterPriceMax = pMax
                    filterStockMin = sMin
                    filterStockMax = sMax
                    filterKategoriId = katId
                    advancedFilterActive = true
                    showAdvancedFilter = false
                },
                onReset = {
                    filterPriceMin = 0f
                    filterPriceMax = 10_000_000f
                    filterStockMin = 0f
                    filterStockMax = 1000f
                    filterKategoriId = null
                    advancedFilterActive = false
                    showAdvancedFilter = false
                }
            )
        }

        // ── Bulk operation progress sheet ─────────────────────────────────────
        if (showBulkProgressSheet) {
            BulkOperationProgressSheet(
                bulkOpState = bulkOpState,
                onRollback = {
                    bulkOpState.currentResult?.operationId?.let { opId ->
                        viewModel.rollbackBulkOperation(opId)
                    }
                },
                onDismiss = {
                    viewModel.clearBulkOperationResult()
                    showBulkProgressSheet = false
                }
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ProductItemCardWithVariants
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ProductItemCardWithVariants(
    product: Product,
    isSelected: Boolean,
    isMultiSelectMode: Boolean,
    isExpanded: Boolean,
    variants: List<ProductVariant>,
    variantsLoading: Boolean,
    onToggleSelect: () -> Unit,
    onLongPress: () -> Unit,
    onExpandVariants: () -> Unit,
    onClick: () -> Unit,
    onStockMovement: () -> Unit,
    onPricingStrategy: () -> Unit
) {
    val isLowStock = product.stok in 1..product.minStok
    val isHabis = product.stok <= 0

    var showContextMenu by remember { mutableStateOf(false) }

    val cardBorderColor by animateColorAsState(
        targetValue = if (isSelected) BizgrowColors.Primary else Color.Transparent,
        label = "cardBorder"
    )
    val cardBgColor by animateColorAsState(
        targetValue = if (isSelected) BizgrowColors.PrimaryLight else BizgrowColors.White,
        label = "cardBg"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = if (isSelected) 2.dp else 0.dp,
                color = cardBorderColor,
                shape = RoundedCornerShape(20.dp)
            )
            .combinedClickable(
                onClick = onClick,
                onLongClick = {
                    if (!isMultiSelectMode) showContextMenu = true
                    onLongPress()
                }
            ),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = cardBgColor),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column {
            // ── Main product row ──────────────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Selection checkbox overlay
                if (isMultiSelectMode) {
                    Checkbox(
                        checked = isSelected,
                        onCheckedChange = { onToggleSelect() },
                        colors = CheckboxDefaults.colors(checkedColor = BizgrowColors.Primary)
                    )
                }

                // Product image
                ProductThumb(product.nama, product.foto, Modifier.size(64.dp), RoundedCornerShape(20.dp))

                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        product.nama,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        fontSize = 15.sp,
                        color = BizgrowColors.Gray950
                    )
                    Text(
                        if (product.sku.isNotBlank()) "SKU: ${product.sku}" else "Tanpa SKU",
                        fontSize = 12.sp,
                        color = BizgrowColors.Gray500
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (product.kategori.isNotBlank()) {
                            Surface(color = BizgrowColors.PrimaryLight, shape = RoundedCornerShape(6.dp)) {
                                Text(
                                    product.kategori,
                                    fontSize = 10.sp,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    color = BizgrowColors.Primary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        if (isHabis) {
                            Surface(color = BizgrowColors.DangerLight, shape = RoundedCornerShape(6.dp)) {
                                Text(
                                    "HABIS",
                                    fontSize = 10.sp,
                                    color = BizgrowColors.Danger,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        } else if (isLowStock) {
                            Surface(color = BizgrowColors.WarningLight, shape = RoundedCornerShape(6.dp)) {
                                Text(
                                    "LOW",
                                    fontSize = 10.sp,
                                    color = BizgrowColors.Warning,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        if (product.hasVariant == 1) {
                            Surface(color = BizgrowColors.Gray100, shape = RoundedCornerShape(6.dp)) {
                                Text(
                                    "Variasi",
                                    fontSize = 10.sp,
                                    color = BizgrowColors.Gray600,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
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
                    // Variant expand icon
                    if (product.hasVariant == 1 && !isMultiSelectMode) {
                        IconButton(
                            onClick = onExpandVariants,
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = if (isExpanded) "Tutup variasi" else "Lihat variasi",
                                tint = BizgrowColors.Primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }

            // ── Context menu ─────────────────────────────────────────────────
            DropdownMenu(
                expanded = showContextMenu,
                onDismissRequest = { showContextMenu = false }
            ) {
                DropdownMenuItem(
                    text = { Text("Lihat Stok") },
                    leadingIcon = { Icon(Icons.Default.Inventory, null) },
                    onClick = { showContextMenu = false; onStockMovement() }
                )
                DropdownMenuItem(
                    text = { Text("Pricing") },
                    leadingIcon = { Icon(Icons.Default.PriceChange, null) },
                    onClick = { showContextMenu = false; onPricingStrategy() }
                )
                DropdownMenuItem(
                    text = { Text("Detail Produk") },
                    leadingIcon = { Icon(Icons.Default.Info, null) },
                    onClick = { showContextMenu = false; onClick() }
                )
            }

            // ── Variants expandable section ───────────────────────────────────
            AnimatedVisibility(visible = isExpanded && product.hasVariant == 1) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(BizgrowColors.Background)
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    HorizontalDivider(color = BizgrowColors.Gray200)
                    Spacer(Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Variasi Produk",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = BizgrowColors.Gray700
                        )
                        Text(
                            "${variants.size} variasi",
                            fontSize = 11.sp,
                            color = BizgrowColors.Gray500
                        )
                    }
                    if (variantsLoading && variants.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = BizgrowColors.Primary
                            )
                        }
                    } else if (variants.isEmpty()) {
                        Text(
                            "Belum ada variasi",
                            fontSize = 12.sp,
                            color = BizgrowColors.Gray400,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    } else {
                        variants.forEach { variant ->
                            VariantRow(variant = variant)
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// VariantRow
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun VariantRow(variant: ProductVariant) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(variant.namaVariasi, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = BizgrowColors.Gray900)
            if (variant.sku.isNotBlank()) {
                Text("SKU: ${variant.sku}", fontSize = 11.sp, color = BizgrowColors.Gray500)
            }
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                "Rp ${"%,.0f".format(variant.hargaJual)}",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = BizgrowColors.Primary
            )
            val stockColor = if (variant.stok <= 0) BizgrowColors.Danger
            else if (variant.stok <= variant.minStok) BizgrowColors.Warning
            else BizgrowColors.Success
            Text("${variant.stok} stok", fontSize = 11.sp, color = stockColor, fontWeight = FontWeight.Medium)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AdvancedProductFilterSheet
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdvancedProductFilterSheet(
    kategoriList: List<KategoriProduk>,
    priceMin: Float,
    priceMax: Float,
    stockMin: Float,
    stockMax: Float,
    selectedKategoriId: Int?,
    onDismiss: () -> Unit,
    onApply: (priceMin: Float, priceMax: Float, stockMin: Float, stockMax: Float, kategoriId: Int?) -> Unit,
    onReset: () -> Unit
) {
    var localPriceRange by remember { mutableStateOf(priceMin..priceMax) }
    var localStockRange by remember { mutableStateOf(stockMin..stockMax) }
    var localKategoriId by remember { mutableStateOf(selectedKategoriId) }
    var expandedKategori by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = BizgrowColors.Surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Filter Lanjutan", fontSize = 20.sp, fontWeight = FontWeight.Black, color = BizgrowColors.Gray950)
                TextButton(onClick = onReset) {
                    Text("Reset", color = BizgrowColors.Danger, fontWeight = FontWeight.Bold)
                }
            }

            HorizontalDivider(color = BizgrowColors.Gray200)

            // ── Price range ───────────────────────────────────────────────────
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Rentang Harga Jual", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BizgrowColors.Gray800)
                    Text(
                        "Rp ${"%,.0f".format(localPriceRange.start)} – Rp ${"%,.0f".format(localPriceRange.endInclusive)}",
                        fontSize = 12.sp,
                        color = BizgrowColors.Primary,
                        fontWeight = FontWeight.Medium
                    )
                }
                RangeSlider(
                    value = localPriceRange,
                    onValueChange = { localPriceRange = it },
                    valueRange = 0f..10_000_000f,
                    steps = 99,
                    colors = SliderDefaults.colors(
                        thumbColor = BizgrowColors.Primary,
                        activeTrackColor = BizgrowColors.Primary,
                        inactiveTrackColor = BizgrowColors.Gray200
                    )
                )
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Rp 0", fontSize = 11.sp, color = BizgrowColors.Gray500)
                    Text("Rp 10.000.000", fontSize = 11.sp, color = BizgrowColors.Gray500)
                }
            }

            // ── Stock range ───────────────────────────────────────────────────
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Rentang Stok", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BizgrowColors.Gray800)
                    Text(
                        "${localStockRange.start.toInt()} – ${localStockRange.endInclusive.toInt()} unit",
                        fontSize = 12.sp,
                        color = BizgrowColors.Primary,
                        fontWeight = FontWeight.Medium
                    )
                }
                RangeSlider(
                    value = localStockRange,
                    onValueChange = { localStockRange = it },
                    valueRange = 0f..1000f,
                    steps = 99,
                    colors = SliderDefaults.colors(
                        thumbColor = BizgrowColors.Primary,
                        activeTrackColor = BizgrowColors.Primary,
                        inactiveTrackColor = BizgrowColors.Gray200
                    )
                )
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("0", fontSize = 11.sp, color = BizgrowColors.Gray500)
                    Text("1000", fontSize = 11.sp, color = BizgrowColors.Gray500)
                }
            }

            // ── Category filter ───────────────────────────────────────────────
            if (kategoriList.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Kategori", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BizgrowColors.Gray800)
                    ExposedDropdownMenuBox(
                        expanded = expandedKategori,
                        onExpandedChange = { expandedKategori = !expandedKategori }
                    ) {
                        OutlinedTextField(
                            value = kategoriList.firstOrNull { it.id == localKategoriId }?.namaKategori ?: "Semua Kategori",
                            onValueChange = {},
                            readOnly = true,
                            leadingIcon = { Icon(Icons.Default.Category, null, tint = BizgrowColors.Gray400) },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedKategori) },
                            modifier = Modifier.menuAnchor().fillMaxWidth(),
                            shape = RoundedCornerShape(20.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BizgrowColors.Primary,
                                unfocusedBorderColor = BizgrowColors.Gray300
                            )
                        )
                        ExposedDropdownMenu(
                            expanded = expandedKategori,
                            onDismissRequest = { expandedKategori = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Semua Kategori") },
                                onClick = { localKategoriId = null; expandedKategori = false }
                            )
                            kategoriList.forEach { k ->
                                DropdownMenuItem(
                                    text = { Text(k.namaKategori) },
                                    onClick = { localKategoriId = k.id; expandedKategori = false }
                                )
                            }
                        }
                    }
                }
            }

            // ── Action buttons ────────────────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, BizgrowColors.Gray300)
                ) {
                    Text("Batal", fontWeight = FontWeight.Bold, color = BizgrowColors.Gray700)
                }
                Button(
                    onClick = {
                        onApply(
                            localPriceRange.start,
                            localPriceRange.endInclusive,
                            localStockRange.start,
                            localStockRange.endInclusive,
                            localKategoriId
                        )
                    },
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary)
                ) {
                    Text("Terapkan", fontWeight = FontWeight.Bold, color = BizgrowColors.White)
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BulkOperationProgressSheet
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BulkOperationProgressSheet(
    bulkOpState: com.upstyle.bizgrow.ui.state.BulkOperationState,
    onRollback: () -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false),
        containerColor = BizgrowColors.Surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Hasil Operasi Bulk", fontSize = 18.sp, fontWeight = FontWeight.Black, color = BizgrowColors.Gray950)
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, null, tint = BizgrowColors.Gray500)
                }
            }

            HorizontalDivider(color = BizgrowColors.Gray200)

            if (bulkOpState.isRunning) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    CircularProgressIndicator(color = BizgrowColors.Primary)
                    Text("Memproses...", color = BizgrowColors.Gray600, fontWeight = FontWeight.Medium)
                    LinearProgressIndicator(
                        progress = { bulkOpState.progress },
                        modifier = Modifier.fillMaxWidth(),
                        color = BizgrowColors.Primary,
                        trackColor = BizgrowColors.Gray200
                    )
                }
            } else {
                val result = bulkOpState.currentResult
                if (result != null) {
                    // Summary stats
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Surface(
                            modifier = Modifier.weight(1f),
                            color = BizgrowColors.SuccessLight ?: BizgrowColors.PrimaryLight,
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    "${result.successCount}",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black,
                                    color = BizgrowColors.Success
                                )
                                Text("Berhasil", fontSize = 12.sp, color = BizgrowColors.Gray600, fontWeight = FontWeight.Medium)
                            }
                        }
                        Surface(
                            modifier = Modifier.weight(1f),
                            color = BizgrowColors.DangerLight,
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    "${result.failureCount}",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black,
                                    color = BizgrowColors.Danger
                                )
                                Text("Gagal", fontSize = 12.sp, color = BizgrowColors.Gray600, fontWeight = FontWeight.Medium)
                            }
                        }
                    }

                    // Per-item results
                    if (result.itemResults.isNotEmpty()) {
                        Text("Detail Per Item", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BizgrowColors.Gray800)
                        LazyColumn(
                            modifier = Modifier.fillMaxWidth().heightIn(max = 200.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            items(result.itemResults) { item ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (item.success) BizgrowColors.Gray50 ?: BizgrowColors.Background else BizgrowColors.DangerLight)
                                        .padding(horizontal = 12.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        item.productId,
                                        fontSize = 12.sp,
                                        color = BizgrowColors.Gray700,
                                        modifier = Modifier.weight(1f)
                                    )
                                    Icon(
                                        if (item.success) Icons.Default.CheckCircle else Icons.Default.Cancel,
                                        null,
                                        tint = if (item.success) BizgrowColors.Success else BizgrowColors.Danger,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Rollback button
                    if (result.successCount > 0) {
                        OutlinedButton(
                            onClick = onRollback,
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, BizgrowColors.Warning),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = BizgrowColors.Warning)
                        ) {
                            Icon(Icons.Default.Undo, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Rollback Operasi", fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Error state
                bulkOpState.error?.let { err ->
                    Surface(color = BizgrowColors.DangerLight, shape = RoundedCornerShape(12.dp)) {
                        Row(
                            modifier = Modifier.padding(12.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Error, null, tint = BizgrowColors.Danger, modifier = Modifier.size(20.dp))
                            Text(err, fontSize = 13.sp, color = BizgrowColors.Danger, modifier = Modifier.weight(1f))
                        }
                    }
                }
            }

            Button(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary)
            ) {
                Text("Tutup", fontWeight = FontWeight.Bold, color = BizgrowColors.White)
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ProductItemCard (kept for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun ProductItemCard(product: Product, onClick: () -> Unit) {
    ProductItemCardWithVariants(
        product = product,
        isSelected = false,
        isMultiSelectMode = false,
        isExpanded = false,
        variants = emptyList(),
        variantsLoading = false,
        onToggleSelect = {},
        onLongPress = {},
        onExpandVariants = {},
        onClick = onClick,
        onStockMovement = {},
        onPricingStrategy = {}
    )
}

@androidx.compose.runtime.Composable
expect fun rememberImagePickerLauncher(onImageSelected: (String?) -> Unit): () -> Unit
