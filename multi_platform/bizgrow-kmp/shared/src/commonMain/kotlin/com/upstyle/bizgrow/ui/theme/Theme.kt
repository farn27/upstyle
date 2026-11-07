package com.upstyle.bizgrow.ui.theme

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ─── Bizgrow Design System v2 ────────────────────────────────────────────────
// Indigo-violet sebagai warna merek, emerald untuk uang masuk, rose untuk uang keluar.
// Permukaan bersih dengan garis tipis (bukan bayangan tebal) supaya ringan dirender.

/** Palet netral yang berubah mengikuti tema terang / gelap. */
@Immutable
data class BizPalette(
    val isDark: Boolean,
    val background: Color,
    val surface: Color,
    val surfaceVariant: Color,
    val surfaceElevated: Color,
    val border: Color,
    val gray950: Color,
    val gray900: Color,
    val gray800: Color,
    val gray700: Color,
    val gray600: Color,
    val gray500: Color,
    val gray400: Color,
    val gray300: Color,
    val gray200: Color,
    val gray100: Color,
    val gray50: Color,
    val primaryLight: Color,
    val successLight: Color,
    val warningLight: Color,
    val dangerLight: Color,
    val secondaryContainer: Color,
)

private val LightPalette = BizPalette(
    isDark = false,
    background = Color(0xFFF5F6FA),
    surface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFEEF0F6),
    surfaceElevated = Color(0xFFFFFFFF),
    border = Color(0xFFE6E8F0),
    gray950 = Color(0xFF0F1222),
    gray900 = Color(0xFF1B1F33),
    gray800 = Color(0xFF2E3348),
    gray700 = Color(0xFF474D66),
    gray600 = Color(0xFF5E647E),
    gray500 = Color(0xFF6E748E),
    gray400 = Color(0xFF9AA0B8),
    gray300 = Color(0xFFC9CDDB),
    gray200 = Color(0xFFE3E6EF),
    gray100 = Color(0xFFF0F2F7),
    gray50 = Color(0xFFF7F8FB),
    primaryLight = Color(0xFFEEEDFF),
    successLight = Color(0xFFE9FBF3),
    warningLight = Color(0xFFFFF6E5),
    dangerLight = Color(0xFFFFEEF0),
    secondaryContainer = Color(0xFFD7F7EA),
)

private val DarkPalette = BizPalette(
    isDark = true,
    background = Color(0xFF0B0E17),
    surface = Color(0xFF141826),
    surfaceVariant = Color(0xFF1C2133),
    surfaceElevated = Color(0xFF1A1F30),
    border = Color(0xFF262C42),
    gray950 = Color(0xFFF4F5FA),
    gray900 = Color(0xFFE6E8F2),
    gray800 = Color(0xFFD0D4E3),
    gray700 = Color(0xFFB4B9CC),
    gray600 = Color(0xFF9BA1B8),
    gray500 = Color(0xFF8A90A8),
    gray400 = Color(0xFF6C7290),
    gray300 = Color(0xFF454B66),
    gray200 = Color(0xFF2B3149),
    gray100 = Color(0xFF20253A),
    gray50 = Color(0xFF181C2C),
    primaryLight = Color(0xFF26245A),
    successLight = Color(0xFF0F3027),
    warningLight = Color(0xFF3A2A0D),
    dangerLight = Color(0xFF3D1620),
    secondaryContainer = Color(0xFF0F3A2E),
)

val LocalBizPalette = staticCompositionLocalOf { LightPalette }

/**
 * Warna merek + alias netral lama. Warna netral & "Light" sekarang adaptif (ikut dark mode)
 * sehingga layar lama yang memakai BizgrowColors.Gray950 / Background ikut benar di mode gelap.
 */
object BizgrowColors {
    // Merek — Indigo-violet
    val Primary          = Color(0xFF5048E5)
    val PrimaryDark      = Color(0xFF3F37C9)
    val PrimaryDarker    = Color(0xFF2A2390)
    val PrimaryMid       = Color(0xFF8B85F5)
    val Violet           = Color(0xFF7C3AED)

    // Emerald — pertumbuhan / uang masuk
    val Secondary        = Color(0xFF10B981)
    val OnSecondary      = Color.White
    val SecondaryDark    = Color(0xFF047857)

    val Warning          = Color(0xFFF59E0B)
    val WarningDark      = Color(0xFFB45309)
    val Danger           = Color(0xFFF43F5E)
    val DangerDark       = Color(0xFFBE123C)
    val Success          = Color(0xFF10B981)
    val Info             = Color(0xFF0EA5E9)

    val White            = Color.White
    val Black            = Color(0xFF0F1222)

    // ─── Adaptif (ikut tema) ───
    val Background: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.background
    val Surface: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.surface
    val SurfaceVariant: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.surfaceVariant
    val SurfaceElevated: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.surfaceElevated
    val Border: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.border

    val Gray950: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.gray950
    val Gray900: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.gray900
    val Gray800: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.gray800
    val Gray700: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.gray700
    val Gray600: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.gray600
    val Gray500: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.gray500
    val Gray400: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.gray400
    val Gray300: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.gray300
    val Gray200: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.gray200
    val Gray100: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.gray100
    val Gray50: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.gray50

    val Slate900: Color @Composable @ReadOnlyComposable get() = Gray950
    val Slate800: Color @Composable @ReadOnlyComposable get() = Gray900
    val Slate700: Color @Composable @ReadOnlyComposable get() = Gray700
    val Slate500: Color @Composable @ReadOnlyComposable get() = Gray500
    val Slate400: Color @Composable @ReadOnlyComposable get() = Gray400
    val Slate200: Color @Composable @ReadOnlyComposable get() = Gray200
    val Slate100: Color @Composable @ReadOnlyComposable get() = Gray100
    val Slate50: Color @Composable @ReadOnlyComposable get() = Gray50

    val PrimaryLight: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.primaryLight
    val SuccessLight: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.successLight
    val WarningLight: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.warningLight
    val DangerLight: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.dangerLight
    val SecondaryContainer: Color @Composable @ReadOnlyComposable get() = LocalBizPalette.current.secondaryContainer

    // Gradien untuk kartu hero
    val GradPrimary      = listOf(Color(0xFF4F46E5), Color(0xFF7C3AED))
    val GradSuccess      = listOf(Color(0xFF059669), Color(0xFF34D399))
    val GradWarning      = listOf(Color(0xFFD97706), Color(0xFFFBBF24))
    val GradDanger       = listOf(Color(0xFFE11D48), Color(0xFFFB7185))
    val GradDark         = listOf(Color(0xFF1B1F33), Color(0xFF2E3348))
    val GradOcean        = listOf(Color(0xFF0284C7), Color(0xFF38BDF8))
    val GradRose         = listOf(Color(0xFFE11D48), Color(0xFFFB7185))
    val GradEmerald      = listOf(Color(0xFF065F46), Color(0xFF10B981))
    val GradSunset       = listOf(Color(0xFFF97316), Color(0xFFEC4899))
    val GradNight        = listOf(Color(0xFF312E81), Color(0xFF6D28D9), Color(0xFF9333EA))

    /** Warna aksen per modul — dipakai ikon fitur supaya mudah dikenali. */
    val ModuleColors = listOf(
        Color(0xFF5048E5), Color(0xFF10B981), Color(0xFFF59E0B), Color(0xFF0EA5E9),
        Color(0xFFF43F5E), Color(0xFF8B5CF6), Color(0xFF14B8A6), Color(0xFFEC4899)
    )
}

fun List<Color>.asBrush(): Brush = Brush.linearGradient(this)

// ─── Motion: durasi singkat & easing lembut agar animasi terasa halus tapi tetap ringan ──
object BizMotion {
    const val Fast = 150
    const val Medium = 240
    const val Slow = 360
    val Emphasized = CubicBezierEasing(0.2f, 0f, 0f, 1f)
    val Standard = FastOutSlowInEasing
    fun <T> fast() = tween<T>(Fast, easing = Standard)
    fun <T> medium() = tween<T>(Medium, easing = Emphasized)
    fun <T> slow() = tween<T>(Slow, easing = Emphasized)
    fun <T> bouncy() = spring<T>(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow)
    fun <T> snappy() = spring<T>(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium)
}

// ─── Spacing ─────────────────────────────────────────────────────────────────
object BizSpace {
    val xs = 4.dp
    val sm = 8.dp
    val md = 12.dp
    val lg = 16.dp
    val xl = 20.dp
    val xxl = 24.dp
    val screen = 20.dp
}

private fun lightScheme() = lightColorScheme(
    primary = BizgrowColors.Primary,
    onPrimary = Color.White,
    primaryContainer = LightPalette.primaryLight,
    onPrimaryContainer = BizgrowColors.PrimaryDarker,
    secondary = BizgrowColors.Secondary,
    onSecondary = Color.White,
    secondaryContainer = LightPalette.secondaryContainer,
    onSecondaryContainer = BizgrowColors.SecondaryDark,
    tertiary = BizgrowColors.Warning,
    onTertiary = Color.White,
    tertiaryContainer = LightPalette.warningLight,
    onTertiaryContainer = BizgrowColors.WarningDark,
    background = LightPalette.background,
    onBackground = LightPalette.gray950,
    surface = LightPalette.surface,
    onSurface = LightPalette.gray950,
    surfaceVariant = LightPalette.surfaceVariant,
    onSurfaceVariant = LightPalette.gray600,
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFFAFAFD),
    surfaceContainer = Color(0xFFF4F5FA),
    surfaceContainerHigh = Color(0xFFF7F8FB),
    // Card() bawaan memakai warna ini → putih bersih agar layar lama tampil rapi di atas latar abu muda
    surfaceContainerHighest = Color(0xFFFFFFFF),
    outline = Color(0xFFD5D8E3),
    outlineVariant = LightPalette.border,
    error = BizgrowColors.Danger,
    onError = Color.White,
    errorContainer = LightPalette.dangerLight,
    onErrorContainer = BizgrowColors.DangerDark,
    inverseSurface = LightPalette.gray900,
    inverseOnSurface = LightPalette.gray100,
    inversePrimary = BizgrowColors.PrimaryMid,
    scrim = Color(0xFF000000),
)

private fun darkScheme() = darkColorScheme(
    primary = Color(0xFF8B85F5),
    onPrimary = Color(0xFF15124A),
    primaryContainer = DarkPalette.primaryLight,
    onPrimaryContainer = Color(0xFFD9D7FF),
    secondary = Color(0xFF34D399),
    onSecondary = Color(0xFF022C22),
    secondaryContainer = DarkPalette.secondaryContainer,
    onSecondaryContainer = Color(0xFFA7F3D0),
    tertiary = Color(0xFFFBBF24),
    onTertiary = Color(0xFF3A2A0D),
    tertiaryContainer = DarkPalette.warningLight,
    onTertiaryContainer = Color(0xFFFDE68A),
    background = DarkPalette.background,
    onBackground = DarkPalette.gray950,
    surface = DarkPalette.surface,
    onSurface = DarkPalette.gray950,
    surfaceVariant = DarkPalette.surfaceVariant,
    onSurfaceVariant = DarkPalette.gray600,
    surfaceContainerLowest = Color(0xFF0E1220),
    surfaceContainerLow = Color(0xFF121626),
    surfaceContainer = Color(0xFF161B2B),
    surfaceContainerHigh = Color(0xFF1A1F30),
    surfaceContainerHighest = Color(0xFF181D2C),
    outline = Color(0xFF3A4060),
    outlineVariant = DarkPalette.border,
    error = Color(0xFFFB7185),
    onError = Color(0xFF4C0519),
    errorContainer = DarkPalette.dangerLight,
    onErrorContainer = Color(0xFFFECDD3),
    inverseSurface = DarkPalette.gray900,
    inverseOnSurface = DarkPalette.gray100,
    inversePrimary = BizgrowColors.Primary,
)

// ─── Typography (font sistem: tanpa unduhan font, tetap ringan) ─────────────
val BizgrowTypography = Typography(
    displayLarge   = TextStyle(fontWeight = FontWeight.ExtraBold, fontSize = 34.sp, letterSpacing = (-1.2).sp, lineHeight = 40.sp),
    displayMedium  = TextStyle(fontWeight = FontWeight.ExtraBold, fontSize = 30.sp, letterSpacing = (-1).sp, lineHeight = 36.sp),
    displaySmall   = TextStyle(fontWeight = FontWeight.Bold,      fontSize = 26.sp, letterSpacing = (-0.6).sp, lineHeight = 32.sp),
    headlineLarge  = TextStyle(fontWeight = FontWeight.Bold,      fontSize = 26.sp, letterSpacing = (-0.5).sp, lineHeight = 32.sp),
    headlineMedium = TextStyle(fontWeight = FontWeight.Bold,      fontSize = 22.sp, letterSpacing = (-0.4).sp, lineHeight = 28.sp),
    headlineSmall  = TextStyle(fontWeight = FontWeight.Bold,      fontSize = 19.sp, letterSpacing = (-0.2).sp, lineHeight = 26.sp),
    titleLarge     = TextStyle(fontWeight = FontWeight.Bold,      fontSize = 18.sp, letterSpacing = (-0.2).sp, lineHeight = 24.sp),
    titleMedium    = TextStyle(fontWeight = FontWeight.SemiBold,  fontSize = 15.sp, letterSpacing = 0.sp,     lineHeight = 22.sp),
    titleSmall     = TextStyle(fontWeight = FontWeight.SemiBold,  fontSize = 13.sp, letterSpacing = 0.1.sp,   lineHeight = 18.sp),
    bodyLarge      = TextStyle(fontWeight = FontWeight.Normal,    fontSize = 15.sp, letterSpacing = 0.sp,     lineHeight = 22.sp),
    bodyMedium     = TextStyle(fontWeight = FontWeight.Normal,    fontSize = 13.sp, letterSpacing = 0.1.sp,   lineHeight = 19.sp),
    bodySmall      = TextStyle(fontWeight = FontWeight.Normal,    fontSize = 12.sp, letterSpacing = 0.2.sp,   lineHeight = 16.sp),
    labelLarge     = TextStyle(fontWeight = FontWeight.SemiBold,  fontSize = 14.sp, letterSpacing = 0.1.sp),
    labelMedium    = TextStyle(fontWeight = FontWeight.SemiBold,  fontSize = 12.sp, letterSpacing = 0.2.sp),
    labelSmall     = TextStyle(fontWeight = FontWeight.SemiBold,  fontSize = 10.sp, letterSpacing = 0.4.sp),
)

val BizgrowShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small      = RoundedCornerShape(12.dp),
    medium     = RoundedCornerShape(16.dp),
    large      = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

@Composable
fun BizgrowTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    val palette = if (darkTheme) DarkPalette else LightPalette
    CompositionLocalProvider(LocalBizPalette provides palette) {
        MaterialTheme(
            colorScheme = if (darkTheme) darkScheme() else lightScheme(),
            typography  = BizgrowTypography,
            shapes      = BizgrowShapes,
            content     = content
        )
    }
}
