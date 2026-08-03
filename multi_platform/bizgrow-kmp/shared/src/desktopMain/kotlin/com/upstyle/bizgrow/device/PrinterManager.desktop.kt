package com.upstyle.bizgrow.device

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

actual class PrinterManager {
    actual fun connectAndPrint(
        macAddress: String,
        receiptText: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        // Desktop mock
        onError("Pencetakan Bluetooth Android tidak berjalan di Desktop. Gunakan driver printer USB sistem.")
    }
}

@Composable
actual fun rememberPrinterManager(): PrinterManager {
    return remember { PrinterManager() }
}
