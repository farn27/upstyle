package com.upstyle.bizgrow.ui.screens

import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val BATAS_BYTE = 5 * 1024 * 1024

@Composable
actual fun rememberPemilihFile(onHasil: (file: FileTerpilih?, galat: String?) -> Unit): () -> Unit {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val terbaru = rememberUpdatedState(onHasil)
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            val hasil = withContext(Dispatchers.IO) {
                runCatching {
                    val resolver = context.contentResolver
                    var nama = "file"
                    var ukuran = -1L
                    resolver.query(uri, null, null, null, null)?.use { c ->
                        if (c.moveToFirst()) {
                            val n = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                            val s = c.getColumnIndex(OpenableColumns.SIZE)
                            if (n >= 0) nama = c.getString(n) ?: nama
                            if (s >= 0 && !c.isNull(s)) ukuran = c.getLong(s)
                        }
                    }
                    if (ukuran > BATAS_BYTE) return@runCatching null to "Ukuran file lebih dari 5 MB"
                    val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                        ?: return@runCatching null to "File tidak bisa dibaca"
                    if (bytes.size > BATAS_BYTE) null to "Ukuran file lebih dari 5 MB" else FileTerpilih(nama, bytes) to null
                }.getOrElse { null to "File tidak bisa dibaca" }
            }
            terbaru.value(hasil.first, hasil.second)
        }
    }
    return remember(launcher) { { launcher.launch("*/*") } }
}
