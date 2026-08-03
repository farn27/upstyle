package com.upstyle.bizgrow.device

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

actual class LocationTracker {
    actual fun getCurrentLocation(
        onSuccess: (LocationData) -> Unit,
        onError: (String) -> Unit
    ) {
        // Desktop mock
        onError("Validasi GPS tidak didukung di aplikasi Desktop.")
    }
}

@Composable
actual fun rememberLocationTracker(): LocationTracker {
    return remember { LocationTracker() }
}
