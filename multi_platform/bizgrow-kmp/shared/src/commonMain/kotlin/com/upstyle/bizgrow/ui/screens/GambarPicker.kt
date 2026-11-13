package com.upstyle.bizgrow.ui.screens

import androidx.compose.runtime.Composable

/**
 * Pembaca gambar dari URI hasil pemilih foto. Mengembalikan JPEG yang sudah diperkecil (maks ±1280 px)
 * supaya aman diunggah; null bila tidak bisa dibaca / platform belum mendukung.
 */
@Composable
expect fun rememberPembacaGambar(): suspend (uri: String) -> ByteArray?

/**
 * OCR di perangkat (gratis, tanpa internet): baca teks dari JPEG. Dipakai bila akun AI tidak punya
 * model visi — teks ini yang dikirim ke server untuk dirapikan. Null bila platform belum mendukung.
 */
expect suspend fun bacaTeksGambar(bytes: ByteArray): String?
