package com.upstyle.bizgrow.ui.screens

import androidx.compose.runtime.Composable

/** File yang dipilih pengguna (isi sudah dibaca ke memori). */
class FileTerpilih(val nama: String, val bytes: ByteArray)

/**
 * Pemilih file umum (CSV / Excel). Mengembalikan fungsi yang membuka pemilih file; hasilnya dikirim ke [onHasil]
 * sebagai file, atau pesan galat (file > 5 MB, tidak terbaca, platform belum mendukung).
 */
@Composable
expect fun rememberPemilihFile(onHasil: (file: FileTerpilih?, galat: String?) -> Unit): () -> Unit
