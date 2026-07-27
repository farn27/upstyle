package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = IndigoPrimary,
    onPrimary = Color.White,
    primaryContainer = Slate800,
    onPrimaryContainer = Color.White,
    secondary = Slate500,
    onSecondary = Color.White,
    background = Slate900,
    onBackground = Color.White,
    surface = Slate800,
    onSurface = Color.White,
    outline = Slate700,
    outlineVariant = Slate800
)

private val LightColorScheme = lightColorScheme(
    primary = IndigoPrimary,
    onPrimary = Color.White,
    primaryContainer = IndigoLight,
    onPrimaryContainer = IndigoPrimary,
    secondary = Slate500,
    onSecondary = Color.White,
    background = Slate50,
    onBackground = Slate900,
    surface = Color.White,
    onSurface = Slate900,
    outline = Slate200,
    outlineVariant = Slate100
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Disable dynamic colors to keep brand consistency
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
