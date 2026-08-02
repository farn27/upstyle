package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.data.*
import coil3.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.draw.clip

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProdukDetailScreen(viewModel: AppViewModel, productId: String) {
    val products by viewModel.products.collectAsStateWithLifecycle()
    val product = products.find { it.id == productId }

    var reason by remember { mutableStateOf("") }
    var stockDelta by remember { mutableStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(product?.nama ?: "Detail Produk") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                actions = {
                    IconButton(onClick = { /* TODO: Edit product */ }) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (product != null) {
                AsyncImage(
                    model = product.foto ?: "https://via.placeholder.com/400",
                    contentDescription = product.nama,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(250.dp)
                        .clip(RoundedCornerShape(12.dp))
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("SKU: ${product.sku}", style = MaterialTheme.typography.bodyLarge)
                        Text("Nama: ${product.nama}", style = MaterialTheme.typography.titleMedium)
                        Text("Kategori: ${product.kategori}", style = MaterialTheme.typography.bodyMedium)
                        Text("Harga Beli: Rp ${"%,.0f".format(product.hargaBeli.toDouble())}", style = MaterialTheme.typography.bodyMedium)
                        Text("Harga Jual: Rp ${"%,.0f".format(product.hargaJual.toDouble())}", style = MaterialTheme.typography.bodyMedium)
                        Text("Stok: ${product.stok}", style = MaterialTheme.typography.bodyMedium)
                        Text("Min Stok: ${product.minStok}", style = MaterialTheme.typography.bodyMedium)
                        Text("Barcode: ${product.barcode}", style = MaterialTheme.typography.bodyMedium)
                    }
                }

                if (product.hasVariant == 1) {
                    Text("Varian Produk", style = MaterialTheme.typography.titleMedium)
                    // Variants list placeholder
                    Text("Produk ini memiliki varian.")
                }

                Divider()

                Text("Penyesuaian Stok", style = MaterialTheme.typography.titleMedium)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Button(onClick = { stockDelta-- }) { Text("-") }
                    Text(stockDelta.toString(), modifier = Modifier.padding(top = 12.dp))
                    Button(onClick = { stockDelta++ }) { Text("+") }
                }

                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Alasan Penyesuaian") },
                    modifier = Modifier.fillMaxWidth()
                )

                Button(
                    onClick = {
                        viewModel.adjustStock(productId, stockDelta, reason, "")
                        stockDelta = 0
                        reason = ""
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Sesuaikan Stok")
                }

                Spacer(modifier = Modifier.weight(1f))

                OutlinedButton(
                    onClick = { viewModel.navigate(Screen.StockLogs) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Lihat Riwayat Stok")
                }
            } else {
                Text("Produk tidak ditemukan.")
            }
        }
    }
}
