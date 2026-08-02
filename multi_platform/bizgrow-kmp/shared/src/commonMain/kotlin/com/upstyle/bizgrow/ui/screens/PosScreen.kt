package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items as lazyRowItems
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items as listItems
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AssignmentReturn
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.data.*
import kotlinx.coroutines.launch
import coil3.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PosScreen(viewModel: AppViewModel) {
    val products by viewModel.products.collectAsStateWithLifecycle()
    val posData by viewModel.posData.collectAsStateWithLifecycle()
    val cart by viewModel.cart.collectAsStateWithLifecycle()
    val cartTotal by viewModel.cartTotal.collectAsStateWithLifecycle()
    val cartItemCount by viewModel.cartItemCount.collectAsStateWithLifecycle()

    var showCartSheet by remember { mutableStateOf(false) }
    var selectedCategory by remember { mutableStateOf("Semua") }
    var searchQuery by remember { mutableStateOf("") }
    
    val categories = listOf("Semua") + products.map { it.kategori }.distinct()
    
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        viewModel.loadProducts()
        viewModel.loadPosData()
    }

    val filteredProducts = products.filter {
        val matchesSearch = it.nama.contains(searchQuery, ignoreCase = true)
        val matchesCategory = if (selectedCategory == "Semua") true else it.kategori == selectedCategory
        matchesSearch && matchesCategory
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Kasir POS", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.navigate(Screen.PosShift) }) {
                        Icon(Icons.Default.Schedule, contentDescription = "Manajemen Shift")
                    }
                    IconButton(onClick = { viewModel.navigate(Screen.PosReturn) }) {
                        Icon(Icons.Default.AssignmentReturn, contentDescription = "Retur")
                    }
                    IconButton(onClick = { viewModel.navigate(Screen.BarcodeScanner) }) {
                        Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan Barcode")
                    }
                    IconButton(onClick = { showCartSheet = true }) {
                        BadgedBox(
                            badge = { if (cartItemCount > 0) Badge { Text(cartItemCount.toString()) } }
                        ) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = "Keranjang")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                )
            )
        },
        bottomBar = {
            Column {
                AnimatedVisibility(visible = cartItemCount > 0) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                            .clickable { showCartSheet = true },
                        shape = RoundedCornerShape(16.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    Brush.horizontalGradient(
                                        colors = listOf(
                                            MaterialTheme.colorScheme.primary,
                                            MaterialTheme.colorScheme.tertiary
                                        )
                                    )
                                )
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "$cartItemCount Item",
                                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f),
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    text = "Rp ${"%,.0f".format(cartTotal)}",
                                    color = MaterialTheme.colorScheme.onPrimary,
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleLarge
                                )
                            }
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                contentColor = MaterialTheme.colorScheme.primary
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Checkout", fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Icon(Icons.Default.ShoppingCart, contentDescription = null, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                }
                BottomNavBar(viewModel, Screen.Pos)
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f))
        ) {
            // Premium Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Cari produk atau SKU...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    IconButton(onClick = {
                        // Simulasi scan barcode dengan set query ke dummy SKU
                        // Di implementasi aslinya, ini akan memanggil API kamera/barcode scanner
                        searchQuery = "SKU-DUMMY-123"
                    }) {
                        Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan Barcode")
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(24.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = Color.Transparent,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                ),
                singleLine = true
            )

            // Dynamic Category Row
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                lazyRowItems(categories) { cat ->
                    val isSelected = selectedCategory == cat
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                        contentColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                        border = if (!isSelected) BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant) else null,
                        modifier = Modifier.clickable { selectedCategory = cat }
                    ) {
                        Text(
                            text = cat,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }
            }

            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                gridItems(filteredProducts) { product ->
                    val cartQty = cart[product] ?: 0
                    PosProductCardPremium(
                        product = product,
                        cartQty = cartQty,
                        onAdd = { viewModel.addToCart(product) },
                        onIncrease = { viewModel.addToCart(product, 1) },
                        onDecrease = { viewModel.removeFromCart(product) }
                    )
                }
            }
        }

        if (showCartSheet) {
            ModalBottomSheet(
                onDismissRequest = { showCartSheet = false },
                containerColor = MaterialTheme.colorScheme.surface,
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            ) {
                CartCheckoutSheetPremium(
                    viewModel = viewModel,
                    cart = cart,
                    cartTotal = cartTotal,
                    customers = posData?.customers ?: emptyList(),
                    onDismiss = { showCartSheet = false },
                    onPrintRequested = {
                        scope.launch {
                            snackbarHostState.showSnackbar("Mencetak struk ke printer Bluetooth...")
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun PosProductCardPremium(
    product: Product,
    cartQty: Int,
    onAdd: () -> Unit,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit
) {
    val isOutOfStock = product.stok <= 0
    var showVariationDialog by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Box(modifier = Modifier.fillMaxWidth().height(120.dp)) {
                    AsyncImage(
                        model = product.foto ?: "https://via.placeholder.com/150",
                        contentDescription = product.nama,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .padding(8.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (isOutOfStock) MaterialTheme.colorScheme.errorContainer 
                                else MaterialTheme.colorScheme.tertiaryContainer
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = if (isOutOfStock) "Habis" else "Stok: ${product.stok}", 
                            color = if (isOutOfStock) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onTertiaryContainer,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = product.nama, 
                    fontWeight = FontWeight.Bold, 
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "Rp ${"%,.0f".format(product.hargaJual.toDouble())}", 
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
            }
            } // Close inner Column
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                    .padding(8.dp)
            ) {
                if (isOutOfStock) {
                    Button(
                        onClick = {}, 
                        enabled = false, 
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Habis", fontWeight = FontWeight.Bold)
                    }
                } else if (cartQty > 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = onDecrease,
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surface)
                                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, CircleShape)
                        ) { Text("-", fontWeight = FontWeight.Bold) }
                        
                        Text(
                            text = cartQty.toString(), 
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleMedium
                        )
                        
                        IconButton(
                            onClick = onIncrease,
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary)
                        ) { Text("+", color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold) }
                    }
                } else {
                    Button(
                        onClick = { 
                            showVariationDialog = true
                        }, 
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Tambah", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    if (showVariationDialog) {
        AlertDialog(
            onDismissRequest = { showVariationDialog = false },
            title = { Text("Pilih Variasi", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Pilih variasi produk sebelum menambahkan ke keranjang:")
                    if (product.variants.isEmpty()) {
                        Text("Tidak ada variasi yang tersedia.", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                    } else {
                        // Untuk simplicity, kita asumsikan hanya ada 1 level variasi
                        // Di masa depan bisa pakai LazyRow / FlowRow
                        var selectedVariantId by remember { mutableStateOf(product.variants.firstOrNull()?.id) }
                        
                        Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            product.variants.forEach { variant ->
                                FilterChip(
                                    selected = selectedVariantId == variant.id, 
                                    onClick = { selectedVariantId = variant.id }, 
                                    label = { Text(variant.namaVariasi) }
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = { 
                    onAdd()
                    showVariationDialog = false
                }) {
                    Text("Konfirmasi")
                }
            },
            dismissButton = {
                TextButton(onClick = { showVariationDialog = false }) { Text("Batal") }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartCheckoutSheetPremium(
    viewModel: AppViewModel,
    cart: Map<Product, Int>,
    cartTotal: Double,
    customers: List<PosCustomer>,
    onDismiss: () -> Unit,
    onPrintRequested: () -> Unit
) {
    val posDiskon by viewModel.posDiskon.collectAsStateWithLifecycle()
    var diskonText by remember { mutableStateOf(if (posDiskon == 0.0) "" else posDiskon.toString()) }
    var selectedMethod by remember { mutableStateOf("CASH") }
    val methods = listOf("CASH", "QRIS", "TRANSFER", "KREDIT")
    
    val selectedCustomerId by viewModel.selectedCustomerId.collectAsStateWithLifecycle()
    val selectedCustomer = customers.find { it.id == selectedCustomerId }
    var expandedCustomer by remember { mutableStateOf(false) }

    var selectedOrderType by remember { mutableStateOf("Dine In") }
    var tableNumber by remember { mutableStateOf("") }
    
    var isSplitPayment by remember { mutableStateOf(false) }
    var splitMethod1 by remember { mutableStateOf("CASH") }
    var splitMethod2 by remember { mutableStateOf("QRIS") }
    var splitAmount1 by remember { mutableStateOf("") }

    LaunchedEffect(diskonText) {
        val d = diskonText.toDoubleOrNull() ?: 0.0
        viewModel.setDiskon(d)
    }

    val diskon = diskonText.toDoubleOrNull() ?: 0.0
    val finalTotal = cartTotal - diskon

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        Text("Detail Pembayaran", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 150.dp)
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                listItems(cart.entries.toList()) { entry ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        AsyncImage(
                            model = entry.key.foto ?: "https://via.placeholder.com/150",
                            contentDescription = entry.key.nama,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(50.dp)
                                .clip(RoundedCornerShape(8.dp))
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text(entry.key.nama, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text("x${entry.value} @ Rp ${"%,.0f".format(entry.key.hargaJual.toDouble())}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text("Rp ${"%,.0f".format(entry.key.hargaJual.toDouble() * entry.value)}", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ExposedDropdownMenuBox(
                expanded = expandedCustomer,
                onExpandedChange = { expandedCustomer = it },
                modifier = Modifier.weight(1f)
            ) {
                OutlinedTextField(
                    value = selectedCustomer?.namaCustomer ?: "Customer Umum",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Pelanggan") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedCustomer) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                    )
                )
                ExposedDropdownMenu(
                    expanded = expandedCustomer,
                    onDismissRequest = { expandedCustomer = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Customer Umum", fontWeight = FontWeight.Bold) },
                        onClick = {
                            viewModel.setCustomer(null)
                            expandedCustomer = false
                        }
                    )
                    Divider()
                    customers.forEach { customer ->
                        DropdownMenuItem(
                            text = { Text(customer.namaCustomer) },
                            onClick = {
                                viewModel.setCustomer(customer.id)
                                expandedCustomer = false
                            }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = diskonText,
                onValueChange = { diskonText = it },
                label = { Text("Diskon (Rp)") },
                modifier = Modifier.weight(0.7f),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                )
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Tipe Pesanan", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = selectedOrderType == "Dine In", onClick = { selectedOrderType = "Dine In" }, label = { Text("Dine In") })
                    FilterChip(selected = selectedOrderType == "Take Away", onClick = { selectedOrderType = "Take Away" }, label = { Text("Take Away") })
                }
            }
            if (selectedOrderType == "Dine In") {
                OutlinedTextField(
                    value = tableNumber,
                    onValueChange = { tableNumber = it },
                    label = { Text("No Meja") },
                    modifier = Modifier.weight(0.7f),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )
            }
        }
        
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Metode Pembayaran", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Split", style = MaterialTheme.typography.bodySmall)
                    androidx.compose.material3.Switch(
                        checked = isSplitPayment,
                        onCheckedChange = { isSplitPayment = it },
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }
            }
            
            if (!isSplitPayment) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    lazyRowItems(methods) { method ->
                        val isSelected = selectedMethod == method
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                            contentColor = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface,
                            border = if (!isSelected) BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant) else BorderStroke(2.dp, MaterialTheme.colorScheme.primary),
                            modifier = Modifier.clickable { selectedMethod = method }
                        ) {
                            Text(
                                text = method,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }
            } else {
                // Split Payment UI
                val amt1 = splitAmount1.toDoubleOrNull() ?: 0.0
                val amt2 = finalTotal - amt1
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Metode 1", style = MaterialTheme.typography.labelSmall)
                        // Simple selector
                        var showM1 by remember { mutableStateOf(false) }
                        Box {
                            OutlinedButton(onClick = { showM1 = true }) { Text(splitMethod1) }
                            DropdownMenu(expanded = showM1, onDismissRequest = { showM1 = false }) {
                                methods.forEach { m ->
                                    DropdownMenuItem(text = { Text(m) }, onClick = { splitMethod1 = m; showM1 = false })
                                }
                            }
                        }
                        OutlinedTextField(
                            value = splitAmount1,
                            onValueChange = { splitAmount1 = it },
                            label = { Text("Jumlah (Rp)") },
                            singleLine = true
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Metode 2", style = MaterialTheme.typography.labelSmall)
                        var showM2 by remember { mutableStateOf(false) }
                        Box {
                            OutlinedButton(onClick = { showM2 = true }) { Text(splitMethod2) }
                            DropdownMenu(expanded = showM2, onDismissRequest = { showM2 = false }) {
                                methods.forEach { m ->
                                    DropdownMenuItem(text = { Text(m) }, onClick = { splitMethod2 = m; showM2 = false })
                                }
                            }
                        }
                        OutlinedTextField(
                            value = amt2.toString(),
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Sisa (Rp)") },
                            singleLine = true
                        )
                    }
                }
            }
        }
        
        Divider(modifier = Modifier.padding(vertical = 8.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("TOTAL TAGIHAN", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Rp ${"%,.0f".format(finalTotal)}", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
        }
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onPrintRequested,
                modifier = Modifier.weight(0.3f).height(56.dp),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Icon(Icons.Default.Print, contentDescription = "Print Struk")
            }
            
            Button(
                onClick = {
                    val methodToSave = if (isSplitPayment) "SPLIT: $splitMethod1 & $splitMethod2" else selectedMethod
                    // Ide: Tipe Pesanan dan Meja disisipkan ke method atau notes. Tapi backend API PosOrder belum mendukung field custom. 
                    // Kita bisa abaikan sementara atau masukkan ke metodeBayar, misal: "DINEIN_T1_CASH".
                    // Kita pakai methodToSave ke checkout().
                    viewModel.checkout(methodToSave, onSuccess = { ok -> if (ok) onDismiss() })
                },
                modifier = Modifier.weight(0.7f).height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("Selesaikan Pembayaran", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
    }
}
