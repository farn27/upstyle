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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.data.*
import kotlinx.coroutines.launch
import coil3.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PosScreen(viewModel: AppViewModel) {
    val products by viewModel.products.collectAsState(initial = viewModel.products.value)
    val posData by viewModel.posData.collectAsState(initial = viewModel.posData.value)
    val cart by viewModel.cart.collectAsState(initial = viewModel.cart.value)
    val cartTotal by viewModel.cartTotal.collectAsState(initial = viewModel.cartTotal.value)
    val cartItemCount by viewModel.cartItemCount.collectAsState(initial = viewModel.cartItemCount.value)

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
        containerColor = BizgrowColors.Background,
        topBar = {
            TopAppBar(
                title = { Text("Point of Sale", fontWeight = FontWeight.Bold, color = BizgrowColors.Gray950) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = BizgrowColors.Gray900)
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.navigate(Screen.PosVouchers) }) {
                        Icon(Icons.Default.ShoppingCart, contentDescription = "Voucher", tint = BizgrowColors.Gray900)
                    }
                    IconButton(onClick = { viewModel.navigate(Screen.PosShift) }) {
                        Icon(Icons.Default.Schedule, contentDescription = "Shift", tint = BizgrowColors.Gray900)
                    }
                    IconButton(onClick = { viewModel.navigate(Screen.PosReturn) }) {
                        Icon(Icons.Default.AssignmentReturn, contentDescription = "Retur", tint = BizgrowColors.Gray900)
                    }
                    IconButton(onClick = { showCartSheet = true }) {
                        BadgedBox(
                            badge = { 
                                if (cartItemCount > 0) Badge(containerColor = BizgrowColors.Danger) { Text(cartItemCount.toString(), color = BizgrowColors.White) } 
                            }
                        ) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = "Keranjang", tint = BizgrowColors.Gray900)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BizgrowColors.Surface)
            )
        },
        bottomBar = {
            Column {
                AnimatedVisibility(visible = cartItemCount > 0) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .clickable { showCartSheet = true },
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = BizgrowColors.Primary),
                        elevation = CardDefaults.cardElevation(4.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("$cartItemCount Item", color = BizgrowColors.PrimaryLight, fontSize = 13.sp)
                                Text("Rp ${"%,.0f".format(cartTotal)}", color = BizgrowColors.White, fontWeight = FontWeight.Black, fontSize = 20.sp)
                            }
                            Surface(shape = RoundedCornerShape(20.dp), color = BizgrowColors.White) {
                                Row(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text("Checkout", fontWeight = FontWeight.Bold, color = BizgrowColors.Primary)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Icon(Icons.Default.ShoppingCart, null, modifier = Modifier.size(18.dp), tint = BizgrowColors.Primary)
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
        ) {
            // Premium Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Cari produk atau SKU...", color = BizgrowColors.Gray400) },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = BizgrowColors.Gray400) },
                trailingIcon = {
                    IconButton(onClick = { viewModel.navigate(Screen.BarcodeScanner) }) {
                        Icon(Icons.Default.QrCodeScanner, null, tint = BizgrowColors.Primary)
                    }
                },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                shape = RoundedCornerShape(20.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BizgrowColors.Primary,
                    unfocusedBorderColor = BizgrowColors.Gray200,
                    focusedContainerColor = BizgrowColors.White,
                    unfocusedContainerColor = BizgrowColors.White,
                ),
                singleLine = true
            )

            // Dynamic Category Row
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                lazyRowItems(categories) { cat ->
                    val isSelected = selectedCategory == cat
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) BizgrowColors.Primary else BizgrowColors.White,
                        contentColor = if (isSelected) BizgrowColors.White else BizgrowColors.Gray700,
                        border = if (!isSelected) BorderStroke(1.dp, BizgrowColors.Gray200) else null,
                        modifier = Modifier.clickable { selectedCategory = cat }
                    ) {
                        Text(
                            text = cat,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 13.sp
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

        val printerManager = com.upstyle.bizgrow.device.rememberPrinterManager()

        if (showCartSheet) {
            ModalBottomSheet(
                onDismissRequest = { showCartSheet = false },
                containerColor = BizgrowColors.Surface,
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            ) {
                CartCheckoutSheetPremium(
                    viewModel = viewModel,
                    cart = cart,
                    cartTotal = cartTotal,
                    customers = posData?.customers ?: emptyList(),
                    onDismiss = { showCartSheet = false },
                    onPrintRequested = {
                        scope.launch { snackbarHostState.showSnackbar("Menghubungkan ke printer...") }
                        
                        val receiptText = buildString {
                            appendLine("===== STRUK PEMBAYARAN =====")
                            appendLine("${viewModel.activeUnit.value?.name ?: "Toko"}")
                            appendLine("-----------------------")
                            cart.forEach { (prod, qty) ->
                                appendLine("${prod.nama} x$qty")
                                appendLine("  Rp${"%,.0f".format(prod.hargaJual * qty)}")
                            }
                            appendLine("-----------------------")
                            appendLine("Total: Rp${"%,.0f".format(cartTotal)}")
                            appendLine("Terima Kasih!")
                            appendLine("=======================")
                            appendLine("\n\n")
                        }
                        
                        // Note: MAC address harus di-configure di settings
                        val printerMacAddress = "00:00:00:00:00:00" // Placeholder - perlu config
                        
                        printerManager.connectAndPrint(
                            macAddress = printerMacAddress,
                            receiptText = receiptText,
                            onSuccess = { scope.launch { snackbarHostState.showSnackbar("Struk berhasil dicetak!") } },
                            onError = { err -> scope.launch { snackbarHostState.showSnackbar("Printer belum dikonfigurasi. Set MAC address di Settings.") } }
                        )
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
        modifier = Modifier.fillMaxWidth().height(260.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
            Column {
                Box(modifier = Modifier.fillMaxWidth().height(130.dp)) {
                    AsyncImage(
                        model = product.foto ?: "https://via.placeholder.com/150",
                        contentDescription = product.nama,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .padding(10.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isOutOfStock) BizgrowColors.Danger else BizgrowColors.Success)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = if (isOutOfStock) "Habis" else "Sisa ${product.stok}", 
                            color = BizgrowColors.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = product.nama, 
                        fontWeight = FontWeight.Bold, 
                        fontSize = 14.sp,
                        color = BizgrowColors.Gray950,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Rp ${"%,.0f".format(product.hargaJual.toDouble())}", 
                        fontSize = 13.sp,
                        color = BizgrowColors.Primary,
                        fontWeight = FontWeight.Black
                    )
                }
            }
            
            Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 12.dp)) {
                if (isOutOfStock) {
                    Button(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth().height(40.dp), shape = RoundedCornerShape(10.dp)) {
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
                            modifier = Modifier.size(36.dp).background(BizgrowColors.Gray100, CircleShape)
                        ) { Text("-", fontWeight = FontWeight.Bold, color = BizgrowColors.Gray900) }
                        
                        Text(cartQty.toString(), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BizgrowColors.Gray950)
                        
                        IconButton(
                            onClick = onIncrease,
                            modifier = Modifier.size(36.dp).background(BizgrowColors.Primary, CircleShape)
                        ) { Text("+", color = BizgrowColors.White, fontWeight = FontWeight.Bold) }
                    }
                } else {
                    OutlinedButton(
                        onClick = { showVariationDialog = true }, 
                        modifier = Modifier.fillMaxWidth().height(40.dp),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, BizgrowColors.Primary)
                    ) {
                        Text("Tambah", fontWeight = FontWeight.Bold, color = BizgrowColors.Primary)
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
                        Text("Tidak ada variasi yang tersedia.", color = BizgrowColors.Danger, fontSize = 12.sp)
                    } else {
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
            confirmButton = { Button(onClick = { onAdd(); showVariationDialog = false }) { Text("Pilih") } },
            dismissButton = { TextButton(onClick = { showVariationDialog = false }) { Text("Batal") } }
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
    val posDiskon by viewModel.posDiskon.collectAsState(initial = viewModel.posDiskon.value)
    var diskonText by remember { mutableStateOf(if (posDiskon == 0.0) "" else posDiskon.toString()) }
    var selectedMethod by remember { mutableStateOf("CASH") }
    val methods = listOf("CASH", "QRIS", "TRANSFER")
    
    val selectedCustomerId by viewModel.selectedCustomerId.collectAsState(initial = viewModel.selectedCustomerId.value)
    val selectedCustomer = customers.find { it.id == selectedCustomerId }
    var expandedCustomer by remember { mutableStateOf(false) }
    var selectedOrderType by remember { mutableStateOf("Dine In") }

    LaunchedEffect(diskonText) {
        val d = diskonText.toDoubleOrNull() ?: 0.0
        viewModel.setDiskon(d)
    }

    val diskon = diskonText.toDoubleOrNull() ?: 0.0
    val finalTotal = cartTotal - diskon

    Column(
        modifier = Modifier.fillMaxWidth().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        Text("Checkout Pesanan", fontSize = 20.sp, fontWeight = FontWeight.Black, color = BizgrowColors.Gray950)
        
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = BizgrowColors.Gray50),
            border = BorderStroke(1.dp, BizgrowColors.Gray200)
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxWidth().heightIn(max = 160.dp).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
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
                            modifier = Modifier.size(48.dp).clip(RoundedCornerShape(12.dp))
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text(entry.key.nama, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = BizgrowColors.Gray950)
                            Text("x${entry.value} @ Rp ${"%,.0f".format(entry.key.hargaJual.toDouble())}", fontSize = 12.sp, color = BizgrowColors.Gray500)
                        }
                        Text("Rp ${"%,.0f".format(entry.key.hargaJual.toDouble() * entry.value)}", fontWeight = FontWeight.Black, fontSize = 14.sp)
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
                    onValueChange = {}, readOnly = true,
                    label = { Text("Pelanggan") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedCustomer) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = BizgrowColors.Gray200)
                )
                ExposedDropdownMenu(expanded = expandedCustomer, onDismissRequest = { expandedCustomer = false }) {
                    DropdownMenuItem(text = { Text("Customer Umum", fontWeight = FontWeight.Bold) }, onClick = { viewModel.setCustomer(null); expandedCustomer = false })
                    customers.forEach { customer -> DropdownMenuItem(text = { Text(customer.namaCustomer) }, onClick = { viewModel.setCustomer(customer.id); expandedCustomer = false }) }
                }
            }

            OutlinedTextField(
                value = diskonText, onValueChange = { diskonText = it },
                label = { Text("Diskon (Rp)") }, modifier = Modifier.weight(0.7f),
                shape = RoundedCornerShape(20.dp),
                colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = BizgrowColors.Gray200)
            )
        }
        
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Metode Pembayaran", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BizgrowColors.Gray950)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                lazyRowItems(methods) { method ->
                    val isSelected = selectedMethod == method
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) BizgrowColors.Primary else BizgrowColors.White,
                        contentColor = if (isSelected) BizgrowColors.White else BizgrowColors.Gray700,
                        border = if (!isSelected) BorderStroke(1.dp, BizgrowColors.Gray200) else null,
                        modifier = Modifier.clickable { selectedMethod = method }
                    ) {
                        Text(method, modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp), fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium, fontSize = 13.sp)
                    }
                }
            }
        }
        
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BizgrowColors.Gray200)
        
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("TOTAL", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BizgrowColors.Gray500)
            Text("Rp ${"%,.0f".format(finalTotal)}", fontSize = 28.sp, fontWeight = FontWeight.Black, color = BizgrowColors.Primary)
        }
        
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(
                onClick = onPrintRequested,
                modifier = Modifier.weight(0.25f).height(56.dp),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, BizgrowColors.Gray300)
            ) {
                Icon(Icons.Default.Print, "Print", tint = BizgrowColors.Gray700)
            }
            
            Button(
                onClick = { viewModel.checkout(selectedMethod, onSuccess = { ok -> if (ok) onDismiss() }) },
                modifier = Modifier.weight(0.75f).height(56.dp),
                shape = RoundedCornerShape(20.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Success)
            ) {
                Text("Bayar", fontWeight = FontWeight.Black, fontSize = 16.sp)
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
    }
}
