package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.Product
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

private fun marginPersen(beli: Double, jual: Double): Double? = if (jual > 0) (jual - beli) / jual * 100 else null

/** Harga & margin: ubah harga beli/jual produk dengan indikator margin, tautan ke aturan harga terjadwal. */
@Composable
fun PricingScreen(viewModel: AppViewModel) {
    val produk by viewModel.products.collectAsState(initial = viewModel.products.value)
    var cari by remember { mutableStateOf("") }
    var edit by remember { mutableStateOf<Product?>(null) }
    LaunchedEffect(Unit) { viewModel.loadProducts() }

    val aktif = produk.filter { it.status != "archived" }
    val tampil = aktif.filter { cari.isBlank() || it.nama.contains(cari, true) || it.sku.contains(cari, true) }
    val rugi = aktif.count { it.hargaJual in 0.0..it.hargaBeli && it.hargaBeli > 0 }

    BizScreen(title = "Harga & margin", subtitle = "${aktif.size} produk" + if (rugi > 0) " • $rugi dijual di bawah modal" else "", onBack = { viewModel.navigateBack() }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            BizSearchField(cari, { cari = it }, "Cari produk / SKU…", Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
            if (tampil.isEmpty()) EmptyView(if (aktif.isEmpty()) "Belum ada produk" else "Produk tidak ditemukan", null, Icons.Rounded.Sell)
            else LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(tampil, key = { it.id }) { p ->
                    val m = marginPersen(p.hargaBeli, p.hargaJual)
                    val warna = when { m == null -> MaterialTheme.colorScheme.onSurfaceVariant; m < 0 -> BizgrowColors.Danger; m < 15 -> BizgrowColors.Warning; else -> BizgrowColors.Success }
                    BizSurface(Modifier.fillMaxWidth(), onClick = { edit = p }, contentPadding = PaddingValues(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ProductThumb(p.nama, p.foto, Modifier.size(48.dp), androidx.compose.foundation.shape.RoundedCornerShape(14.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(p.nama, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("Beli ${p.hargaBeli.rupiah()}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(p.hargaJual.rupiah(), fontWeight = FontWeight.Bold, color = BizgrowColors.Primary)
                                if (m != null) StatusChip("Margin ${"%.0f".format(m)}%", warna)
                            }
                        }
                    }
                }
            }
        }
    }

    edit?.let { p ->
        var beli by remember(p.id) { mutableStateOf(p.hargaBeli.toLong().toString()) }
        var jual by remember(p.id) { mutableStateOf(p.hargaJual.toLong().toString()) }
        var minStok by remember(p.id) { mutableStateOf(p.minStok.toString()) }
        val b = beli.toDoubleOrNull() ?: 0.0
        val j = jual.toDoubleOrNull() ?: 0.0
        val m = marginPersen(b, j)
        FormSheet(
            judul = p.nama, subjudul = "Ubah harga", onDismiss = { edit = null }, simpanAktif = j > 0,
            onSimpan = { viewModel.ubahHargaProduk(p.id, b, j, minStok.toIntOrNull() ?: p.minStok); edit = null }
        ) {
            AngkaField(beli, { beli = it }, "Harga beli (modal)")
            AngkaField(jual, { jual = it }, "Harga jual")
            AngkaField(minStok, { minStok = it }, "Stok minimum", desimal = false)
            if (m != null) Text(
                "Margin ${"%.1f".format(m)}% • laba per unit ${(j - b).rupiah()}" + if (j < b) " — dijual di bawah modal!" else "",
                style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = if (j < b) BizgrowColors.Danger else BizgrowColors.Success
            )
            BizOutlineButton("Aturan harga terjadwal / diskon periode", onClick = { val id = p.id; edit = null; viewModel.navigate(Screen.PricingStrategy(id)) }, icon = Icons.Rounded.Schedule, modifier = Modifier.fillMaxWidth())
        }
    }
}
