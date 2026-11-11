package com.upstyle.bizgrow.ui.screens

import androidx.compose.runtime.Composable

@Composable
actual fun rememberPembacaGambar(): suspend (uri: String) -> ByteArray? = { null } // iOS: menyusul bersama pemilih foto
