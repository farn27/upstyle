package com.upstyle.bizgrow.ui.screens

import androidx.compose.runtime.Composable

/**
 * Pembaca gambar dari URI hasil pemilih foto. Mengembalikan JPEG yang sudah diperkecil (maks ±1280 px)
 * supaya aman diunggah; null bila tidak bisa dibaca / platform belum mendukung.
 */
@Composable
expect fun rememberPembacaGambar(): suspend (uri: String) -> ByteArray?
