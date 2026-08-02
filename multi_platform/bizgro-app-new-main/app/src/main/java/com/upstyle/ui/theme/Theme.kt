package com.upstyle.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val LightColors = lightColorScheme(
    primary = Color(0xFF1565C0),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD1E4FF),
    onPrimaryContainer = Color(0xFF001C3A),
    secondary = Color(0xFF0D47A1),
    background = Color(0xFFF8FAFF),
    surface = Color.White,
    surfaceVariant = Color(0xFFE8EDF5),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF90CAF9),
    onPrimary = Color(0xFF003059),
    primaryContainer = Color(0xFF004882),
    onPrimaryContainer = Color(0xFFD1E4FF),
    secondary = Color(0xFF82B1FF),
    background = Color(0xFF0F1729),
    surface = Color(0xFF1A2540),
    surfaceVariant = Color(0xFF1E2D47),
)

@Composable
fun UpstyleTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(colorScheme = colorScheme, content = content)
}
