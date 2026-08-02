package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.data.*
import coil3.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductsScreen(viewModel: AppViewModel) {
    val products by viewModel.products.collectAsStateWithLifecycle()
    val lowStockProducts by viewModel.lowStockProducts.collectAsStateWithLifecycle()
    
    var showSearch by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var filterType by remember { mutableStateOf("All") } // All, Low Stock
    
    var showAddProductSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadProducts()
    }

    val filteredProducts = products.filter {
        val matchesSearch = it.nama.contains(searchQuery, ignoreCase = true) || it.sku.contains(searchQuery, ignoreCase = true)
        val matchesFilter = when (filterType) {
            "Low Stock" -> it.stok <= it.minStok
            else -> true
        }
        matchesSearch && matchesFilter
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Produk & Inventori") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Dashboard")
                    }
                },
                actions = {
                    IconButton(onClick = { showSearch = !showSearch }) {
                        Icon(Icons.Default.Search, contentDescription = "Cari")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddProductSheet = true }) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Produk")
            }
        },
        bottomBar = {
            BottomAppBar {
                Spacer(modifier = Modifier.weight(1f))
                Button(onClick = { viewModel.navigate(Screen.StockLogs) }) {
                    Text("Riwayat Stok")
                }
                Spacer(modifier = Modifier.weight(1f))
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            AnimatedVisibility(visible = showSearch) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    label = { Text("Cari produk...") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
            
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = filterType == "All",
                    onClick = { filterType = "All" },
                    label = { Text("Semua (${products.size})") }
                )
                FilterChip(
                    selected = filterType == "Low Stock",
                    onClick = { filterType = "Low Stock" },
                    label = { Text("Low Stock (${lowStockProducts.size})") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Color(0xFFFFEBEE)
                    )
                )
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filteredProducts) { product ->
                    ProductItemCard(
                        product = product,
                        onClick = { viewModel.navigate(Screen.ProdukDetail(product.id)) }
                    )
                }
            }
        }
        
        if (showAddProductSheet) {
            ModalBottomSheet(onDismissRequest = { showAddProductSheet = false }) {
                AddProductForm(
                    onDismiss = { showAddProductSheet = false },
                    onSubmit = { nama, hargaBeli, hargaJual, stok -> 
                        val hBeli = hargaBeli.toDoubleOrNull() ?: 0.0
                        val hJual = hargaJual.toDoubleOrNull() ?: 0.0
                        val st = stok.toIntOrNull() ?: 0
                        viewModel.addProduct(nama, hBeli, hJual, st) { success ->
                            if (success) {
                                showAddProductSheet = false
                            }
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun ProductItemCard(product: Product, onClick: () -> Unit) {
    val isLowStock = product.stok <= product.minStok
    val stockColor = if (isLowStock) Color(0xFFC62828) else MaterialTheme.colorScheme.onSurface

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AsyncImage(
                model = product.foto ?: "https://via.placeholder.com/150",
                contentDescription = product.nama,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(8.dp))
            )
            Column(
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                Text(product.nama, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Text("Rp ${"%,.0f".format(product.hargaJual.toDouble())}", fontWeight = FontWeight.SemiBold)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("SKU: ${product.sku}", style = MaterialTheme.typography.bodySmall)
                Text("Stok: ${product.stok}", color = stockColor, fontWeight = if (isLowStock) FontWeight.Bold else FontWeight.Normal)
            }
            Spacer(modifier = Modifier.height(4.dp))
            SuggestionChip(
                onClick = {},
                label = { Text(product.kategori) }
            )
            }
        }
    }
}

@Composable
fun AddProductForm(onDismiss: () -> Unit, onSubmit: (String, String, String, String) -> Unit) {
    var nama by remember { mutableStateOf("") }
    var hargaBeli by remember { mutableStateOf("") }
    var hargaJual by remember { mutableStateOf("") }
    var stok by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text("Tambah Produk Baru", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(value = nama, onValueChange = { nama = it }, label = { Text("Nama Produk") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = hargaBeli, onValueChange = { hargaBeli = it }, label = { Text("Harga Beli") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = hargaJual, onValueChange = { hargaJual = it }, label = { Text("Harga Jual") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = stok, onValueChange = { stok = it }, label = { Text("Stok Awal") }, modifier = Modifier.fillMaxWidth())
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            TextButton(onClick = onDismiss) { Text("Batal") }
            Button(onClick = { onSubmit(nama, hargaBeli, hargaJual, stok) }) { Text("Simpan") }
        }
    }
}
