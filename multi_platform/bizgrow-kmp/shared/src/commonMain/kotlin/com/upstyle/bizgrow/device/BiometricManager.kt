package com.upstyle.bizgrow.device

import androidx.compose.runtime.Composable

expect class BiometricManager {
    fun authenticate(
        title: String,
        subtitle: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    )
}

@Composable
expect fun rememberBiometricManager(): BiometricManager
