package com.upstyle.bizgrow.device

import androidx.compose.runtime.Composable

expect class PrinterManager {
    fun connectAndPrint(
        macAddress: String,
        receiptText: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    )
}

@Composable
expect fun rememberPrinterManager(): PrinterManager
