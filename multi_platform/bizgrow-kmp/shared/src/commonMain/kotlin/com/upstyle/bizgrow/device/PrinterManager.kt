package com.upstyle.bizgrow.device

import androidx.compose.runtime.Composable

expect class PrinterManager {
    fun connectAndPrint(
        macAddress: String,
        receiptText: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    )

    /** True bila izin Bluetooth runtime sudah diberikan (Android 12+ wajib BLUETOOTH_CONNECT). */
    fun izinSiap(): Boolean

    /** Minta izin Bluetooth ke pengguna; [selesai] dipanggil dengan hasilnya. */
    fun mintaIzin(selesai: (Boolean) -> Unit)

    /** Perangkat Bluetooth yang sudah dipasangkan (nama, alamat MAC); kosong bila izin/Bluetooth belum siap. */
    fun perangkatTerpasang(): List<Pair<String, String>>
}

@Composable
expect fun rememberPrinterManager(): PrinterManager
