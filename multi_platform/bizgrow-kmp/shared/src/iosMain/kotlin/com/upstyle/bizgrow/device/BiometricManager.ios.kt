package com.upstyle.bizgrow.device

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

actual class BiometricManager {
    actual fun authenticate(
        title: String,
        subtitle: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        // Mock iOS implementation
        onError("Biometrics not implemented on iOS yet")
    }
}

@Composable
actual fun rememberBiometricManager(): BiometricManager {
    return remember { BiometricManager() }
}
