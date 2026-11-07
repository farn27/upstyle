package com.upstyle.bizgrow.ui.screens

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState

@Composable
actual fun rememberPemilihFile(onHasil: (file: FileTerpilih?, galat: String?) -> Unit): () -> Unit {
    val terbaru = rememberUpdatedState(onHasil)
    return remember { { terbaru.value(null, "Pemilih file belum tersedia di iOS. Gunakan Android atau web untuk impor.") } }
}
