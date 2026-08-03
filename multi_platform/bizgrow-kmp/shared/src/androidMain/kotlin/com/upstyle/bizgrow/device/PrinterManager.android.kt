package com.upstyle.bizgrow.device

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import java.io.OutputStream
import java.util.UUID

actual class PrinterManager(private val context: Context) {
    actual fun connectAndPrint(
        macAddress: String,
        receiptText: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        // Cek Izin Bluetooth
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                onError("Izin Bluetooth (Connect) belum diberikan.")
                return
            }
        } else {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH) != PackageManager.PERMISSION_GRANTED) {
                onError("Izin Bluetooth belum diberikan.")
                return
            }
        }

        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val bluetoothAdapter: BluetoothAdapter? = bluetoothManager.adapter

        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            onError("Bluetooth mati atau tidak didukung di perangkat ini.")
            return
        }

        try {
            val device = bluetoothAdapter.getRemoteDevice(macAddress)
            val uuid = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb")
            val socket = device.createRfcommSocketToServiceRecord(uuid)
            
            socket.connect()
            val outputStream: OutputStream = socket.outputStream

            // ESC @ (Inisialisasi printer)
            outputStream.write(byteArrayOf(0x1B, 0x40))
            
            // Text receipt (UTF-8 encoding standar POS thermal)
            outputStream.write(receiptText.toByteArray(Charsets.UTF_8))
            
            // Feed paper
            outputStream.write(byteArrayOf(0x0A, 0x0A, 0x0A))
            
            outputStream.flush()
            socket.close()

            onSuccess()
        } catch (e: Exception) {
            e.printStackTrace()
            onError(e.message ?: "Gagal terhubung ke printer. Pastikan alamat MAC benar dan printer menyala.")
        }
    }
}

@Composable
actual fun rememberPrinterManager(): PrinterManager {
    val context = LocalContext.current
    return remember(context) { PrinterManager(context) }
}
