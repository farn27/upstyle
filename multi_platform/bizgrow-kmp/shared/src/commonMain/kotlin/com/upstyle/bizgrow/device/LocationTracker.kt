package com.upstyle.bizgrow.device

import androidx.compose.runtime.Composable

data class LocationData(val latitude: Double, val longitude: Double)

expect class LocationTracker {
    fun getCurrentLocation(
        onSuccess: (LocationData) -> Unit,
        onError: (String) -> Unit
    )
}

@Composable
expect fun rememberLocationTracker(): LocationTracker
