package com.upstyle.bizgrow.ui.screens

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
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
                    // Foto kamera biasanya disimpan "miring" + tag EXIF; BitmapFactory mengabaikannya,
                    // dan JPEG baru tidak membawa EXIF → putar di sini supaya nota terbaca tegak.
                    val derajat = runCatching {
                        resolver.openInputStream(u)?.use {
                            when (ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                                else -> 0f
                            }
                        } ?: 0f
                    }.getOrDefault(0f)
                    val skala = minOf(1f, 1280f / maxOf(bmp.width, bmp.height))
                    val hasil = if (skala < 1f || derajat != 0f) {
                        val m = Matrix().apply { postScale(skala, skala); postRotate(derajat) }
                        Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, m, true)
                    } else bmp
                    ByteArrayOutputStream().also { hasil.compress(Bitmap.CompressFormat.JPEG, 85, it) }.toByteArray()
                }.getOrNull()
            }
        }
        baca
    }
}

actual suspend fun bacaTeksGambar(bytes: ByteArray): String? {
    val bmp = withContext(Dispatchers.Default) { BitmapFactory.decodeByteArray(bytes, 0, bytes.size) } ?: return null
    val pengenal = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    return try {
        suspendCancellableCoroutine { lanjut ->
            pengenal.process(InputImage.fromBitmap(bmp, 0))
                .addOnSuccessListener { hasil -> lanjut.resume(hasil.text) }
                .addOnFailureListener { lanjut.resume(null) }
        }
    } finally {
        pengenal.close()
    }
}
