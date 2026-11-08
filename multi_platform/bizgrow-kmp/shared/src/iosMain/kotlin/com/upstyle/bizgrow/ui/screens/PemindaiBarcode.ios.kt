package com.upstyle.bizgrow.ui.screens

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier

@Composable
actual fun PemindaiBarcode(modifier: Modifier, aktif: Boolean, onKode: (String) -> Unit, onTidakTersedia: (alasan: String) -> Unit) {
    LaunchedEffect(Unit) { onTidakTersedia("Pemindai kamera belum tersedia di iOS. Ketik barcode secara manual.") }
}
