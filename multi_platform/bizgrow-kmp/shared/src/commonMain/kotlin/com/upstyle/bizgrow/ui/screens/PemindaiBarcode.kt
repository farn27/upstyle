package com.upstyle.bizgrow.ui.screens

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * Pratinjau kamera yang membaca barcode/QR. [onKode] dipanggil dengan isi kode yang terbaca (sekali per kode
 * berturut-turut). [onTidakTersedia] dipanggil bila kamera tak bisa dipakai (izin ditolak / platform belum mendukung).
 */
@Composable
expect fun PemindaiBarcode(modifier: Modifier, aktif: Boolean, onKode: (String) -> Unit, onTidakTersedia: (alasan: String) -> Unit)
