package com.upstyle.bizgrow.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

@androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
@Composable
actual fun PemindaiBarcode(modifier: Modifier, aktif: Boolean, onKode: (String) -> Unit, onTidakTersedia: (alasan: String) -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var izin by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) }
    val peminta = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        izin = ok
        if (!ok) onTidakTersedia("Izin kamera ditolak. Aktifkan di Pengaturan HP atau ketik barcode manual.")
    }
    LaunchedEffect(Unit) { if (!izin) peminta.launch(Manifest.permission.CAMERA) }
    if (!izin) return

    val kodeTerbaru = rememberUpdatedState(onKode)
    val aktifTerbaru = rememberUpdatedState(aktif)
    val eksekutor = remember { Executors.newSingleThreadExecutor() }
    val pemindai = remember {
        BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8, Barcode.FORMAT_UPC_A, Barcode.FORMAT_UPC_E, Barcode.FORMAT_CODE_128, Barcode.FORMAT_CODE_39, Barcode.FORMAT_QR_CODE, Barcode.FORMAT_ITF)
                .build()
        )
    }
    var terakhir by remember { mutableStateOf("" to 0L) }

    DisposableEffect(Unit) { onDispose { pemindai.close(); eksekutor.shutdown() } }

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            val view = PreviewView(ctx).apply { scaleType = PreviewView.ScaleType.FILL_CENTER }
            val futur = ProcessCameraProvider.getInstance(ctx)
            futur.addListener({
                try {
                    val provider = futur.get()
                    val preview = Preview.Builder().build().also { it.setSurfaceProvider(view.surfaceProvider) }
                    val analisis = ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
                    analisis.setAnalyzer(eksekutor) { proxy ->
                        val media = proxy.image
                        if (media == null || !aktifTerbaru.value) { proxy.close(); return@setAnalyzer }
                        pemindai.process(InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees))
                            .addOnSuccessListener { hasil ->
                                val kode = hasil.firstOrNull { !it.rawValue.isNullOrBlank() }?.rawValue
                                val sekarang = System.currentTimeMillis()
                                // kode yang sama dalam 2 detik dianggap satu pindaian
                                if (kode != null && (kode != terakhir.first || sekarang - terakhir.second > 2000)) {
                                    terakhir = kode to sekarang
                                    kodeTerbaru.value(kode)
                                }
                            }
                            .addOnCompleteListener { proxy.close() }
                    }
                    provider.unbindAll()
                    provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analisis)
                } catch (e: Exception) {
                    onTidakTersedia("Kamera tidak bisa dibuka: ${e.message}")
                }
            }, ContextCompat.getMainExecutor(ctx))
            view
        }
    )
}
