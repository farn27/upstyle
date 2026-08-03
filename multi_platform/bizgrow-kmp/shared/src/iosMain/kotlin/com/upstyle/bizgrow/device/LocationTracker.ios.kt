package com.upstyle.bizgrow.device

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

actual class LocationTracker {
    actual fun getCurrentLocation(
        onSuccess: (LocationData) -> Unit,
        onError: (String) -> Unit
    ) {
        // Mock iOS implementation
        onError("GPS tidak didukung di iOS saat ini.")
    }
}

@Composable
actual fun rememberLocationTracker(): LocationTracker {
    return remember { LocationTracker() }
}
