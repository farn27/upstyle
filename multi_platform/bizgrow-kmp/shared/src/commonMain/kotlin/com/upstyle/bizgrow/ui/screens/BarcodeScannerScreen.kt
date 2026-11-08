package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.Product
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/** Pindai barcode produk dengan kamera (atau ketik manual) → lihat harga & stok, tambah ke keranjang kasir. */
@Composable
fun BarcodeScannerScreen(viewModel: AppViewModel) {
    val produk by viewModel.products.collectAsState(initial = viewModel.products.value)
    var manual by remember { mutableStateOf("") }
    var kode by remember { mutableStateOf<String?>(null) }
    var alasanKamera by remember { mutableStateOf<String?>(null) }
    var aktif by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) { if (produk.isEmpty()) viewModel.loadProducts() }

    fun cari(k: String): Product? = produk.firstOrNull { it.barcode == k || it.sku.equals(k, true) || it.id == k }
    val hasil = kode?.let { cari(it) }

    BizScreen(title = "Scan barcode", subtitle = "Arahkan kamera ke barcode produk", onBack = { viewModel.navigateBack() }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Box(
                Modifier.fillMaxWidth().height(280.dp).clip(RoundedCornerShape(24.dp)).border(2.dp, BizgrowColors.Primary.copy(alpha = 0.5f), RoundedCornerShape(24.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (alasanKamera == null) {
                    PemindaiBarcode(Modifier.matchParentSize(), aktif, onKode = { kode = it; aktif = false }, onTidakTersedia = { alasanKamera = it })
                    ScannerBrackets()
                } else {
                    Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Rounded.NoPhotography, null, Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(alasanKamera ?: "", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            if (kode != null) {
                BizSurface(Modifier.fillMaxWidth()) {
                    Text("Kode terbaca: $kode", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(6.dp))
                    if (hasil != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ProductThumb(hasil.nama, hasil.foto, Modifier.size(52.dp), RoundedCornerShape(14.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(hasil.nama, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text("Stok ${hasil.stok}" + if (hasil.sku.isNotBlank()) " • ${hasil.sku}" else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(hasil.hargaJual.rupiah(), fontWeight = FontWeight.Bold, color = BizgrowColors.Primary)
                        }
                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            BizOutlineButton("Detail", onClick = { viewModel.navigate(Screen.ProdukDetail(hasil.id)) }, modifier = Modifier.weight(1f))
                            BizButton("Ke keranjang", onClick = { viewModel.addToCart(hasil); viewModel.navigateBack() }, modifier = Modifier.weight(1f), icon = Icons.Rounded.AddShoppingCart, enabled = hasil.stok > 0 || !hasil.bisaDijual)
                        }
                    } else {
                        Text("Produk dengan kode ini belum terdaftar.", color = BizgrowColors.Danger, fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.height(8.dp))
                    BizOutlineButton("Pindai lagi", onClick = { kode = null; aktif = true }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.QrCodeScanner)
                }
            }

            BizSurface(Modifier.fillMaxWidth()) {
                BizTextField(manual, { manual = it }, "Atau ketik barcode / SKU", placeholder = "mis. 8991234567890")
                Spacer(Modifier.height(10.dp))
                BizButton("Cari produk", onClick = { kode = manual.trim(); aktif = false }, modifier = Modifier.fillMaxWidth(), enabled = manual.isNotBlank(), icon = Icons.Rounded.Search)
            }
        }
    }
}

@Composable
fun BoxScope.ScannerBrackets() {
    val warna = MaterialTheme.colorScheme.primary
    val ukuran = 40.dp
    val tebal = 4.dp
    val bentuk = RoundedCornerShape(8.dp)
    for (sudut in listOf(Alignment.TopStart, Alignment.TopEnd, Alignment.BottomStart, Alignment.BottomEnd)) {
        Box(Modifier.align(sudut).padding(16.dp).size(ukuran)) {
            val atas = sudut == Alignment.TopStart || sudut == Alignment.TopEnd
            val kiri = sudut == Alignment.TopStart || sudut == Alignment.BottomStart
            Box(Modifier.fillMaxWidth().height(tebal).align(if (atas) Alignment.TopStart else Alignment.BottomStart).androidxBackground(warna, bentuk))
            Box(Modifier.fillMaxHeight().width(tebal).align(if (kiri) Alignment.TopStart else Alignment.TopEnd).androidxBackground(warna, bentuk))
        }
    }
}

private fun Modifier.androidxBackground(warna: androidx.compose.ui.graphics.Color, bentuk: androidx.compose.ui.graphics.Shape) =
    this.then(Modifier.background(warna, bentuk))
