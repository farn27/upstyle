package com.upstyle.bizgrow.ui.screens

import androidx.compose.runtime.Composable

@Composable
actual fun rememberPembacaGambar(): suspend (uri: String) -> ByteArray? = { null } // iOS: menyusul bersama pemilih foto

actual suspend fun bacaTeksGambar(bytes: ByteArray): String? = null // iOS: menyusul (Vision framework)
