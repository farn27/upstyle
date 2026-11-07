package com.upstyle.bizgrow.ui.screens

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream

@Composable
actual fun rememberPembacaGambar(): suspend (uri: String) -> ByteArray? {
    val context = LocalContext.current
    return remember(context) {
        val baca: suspend (String) -> ByteArray? = { uri: String ->
            withContext(Dispatchers.IO) {
                runCatching {
                    val resolver = context.contentResolver
                    val u = Uri.parse(uri)
                    // 1) ukuran dulu, 2) decode dengan sample size, 3) skala ke maks 1280 px, 4) JPEG 85
                    val batas = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    resolver.openInputStream(u)?.use { BitmapFactory.decodeStream(it, null, batas) }
                    var sample = 1
                    while (batas.outWidth / sample > 2560 || batas.outHeight / sample > 2560) sample *= 2
                    val opsi = BitmapFactory.Options().apply { inSampleSize = sample }
                    val bmp = resolver.openInputStream(u)?.use { BitmapFactory.decodeStream(it, null, opsi) } ?: return@runCatching null
                    val skala = 1280f / maxOf(bmp.width, bmp.height)
                    val hasil = if (skala < 1f) Bitmap.createScaledBitmap(bmp, (bmp.width * skala).toInt(), (bmp.height * skala).toInt(), true) else bmp
                    ByteArrayOutputStream().also { hasil.compress(Bitmap.CompressFormat.JPEG, 85, it) }.toByteArray()
                }.getOrNull()
            }
        }
        baca
    }
}
