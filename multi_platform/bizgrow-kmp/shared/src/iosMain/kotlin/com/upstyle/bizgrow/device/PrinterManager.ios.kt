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
        onError("Pencetakan struk Bluetooth belum didukung untuk iOS saat ini.")
    }
}

@Composable
actual fun rememberPrinterManager(): PrinterManager {
    return remember { PrinterManager() }
}
