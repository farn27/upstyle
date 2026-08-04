package com.upstyle.bizgrow.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ─── Bizgrow Design System — Modern Elegant ──────────────────────────────────
// Palette: Deep Indigo primary + Emerald accent + warm neutrals
object BizgrowColors {
    // Primary — Deep Indigo/Violet (professional, premium)
    val Primary          = Color(0xFF5B5FEF)  // Linear/Stripe Enterprise Indigo
    val PrimaryDark      = Color(0xFF4549D3)
    val PrimaryDarker    = Color(0xFF2C2F8A)
    val PrimaryLight     = Color(0xFFEFF0FE)
    val PrimaryMid       = Color(0xFF818CF8)

    // Secondary — Emerald (growth, money)
    val Secondary        = Color(0xFF10B981)
    val OnSecondary      = Color.White
    val SecondaryContainer = Color(0xFFD1FAE5)
    val SecondaryDark    = Color(0xFF059669)

    // Accent — Amber for warnings
    val Warning          = Color(0xFFF59E0B)
    val WarningLight     = Color(0xFFFFFBEB)
    val WarningDark      = Color(0xFFB45309)

    // Danger
    val Danger           = Color(0xFFEF4444)
    val DangerLight      = Color(0xFFFEF2F2)
    val DangerDark       = Color(0xFFB91C1C)

    // Success
    val Success          = Color(0xFF22C55E)
    val SuccessLight     = Color(0xFFF0FDF4)

    // Neutrals — Warm Gray (more elegant than cold slate)
    val Gray950          = Color(0xFF111827)
    val Gray900          = Color(0xFF1F2937)
    val Gray800          = Color(0xFF374151)
    val Gray700          = Color(0xFF4B5563)
    val Gray600          = Color(0xFF6B7280)
    val Gray500          = Color(0xFF6B7280)
    val Gray400          = Color(0xFF9CA3AF)
    val Gray300          = Color(0xFFD1D5DB)
    val Gray200          = Color(0xFFE5E7EB)
    val Gray100          = Color(0xFFF3F4F6)
    val Gray50           = Color(0xFFF9FAFB)

    // Aliases for backward compat
    val Slate900         = Gray950
    val Slate800         = Gray900
    val Slate700         = Gray700
    val Slate500         = Gray500
    val Slate400         = Gray400
    val Slate200         = Gray200
    val Slate100         = Gray100
    val Slate50          = Gray50

    // Surface
    val Background       = Color(0xFFF9FAFB)
    val Surface          = Color(0xFFFFFFFF)
    val SurfaceVariant   = Color(0xFFF3F4F6)
    val SurfaceElevated  = Color(0xFFFFFFFF)

    val White            = Color.White
    val Black            = Color(0xFF111827)

    // Gradient palettes for premium cards
    val GradPrimary      = listOf(Color(0xFF5B50F0), Color(0xFF8B5CF6))
    val GradSuccess      = listOf(Color(0xFF059669), Color(0xFF34D399))
    val GradWarning      = listOf(Color(0xFFD97706), Color(0xFFFBBF24))
    val GradDanger       = listOf(Color(0xFFDC2626), Color(0xFFF87171))
    val GradDark         = listOf(Color(0xFF1F2937), Color(0xFF374151))
    val GradOcean        = listOf(Color(0xFF0EA5E9), Color(0xFF38BDF8))
    val GradRose         = listOf(Color(0xFFE11D48), Color(0xFFFB7185))
    val GradEmerald      = listOf(Color(0xFF065F46), Color(0xFF10B981))
}

private val LightColors = lightColorScheme(
    primary                = BizgrowColors.Primary,
    onPrimary              = Color.White,
    primaryContainer       = BizgrowColors.PrimaryLight,
    onPrimaryContainer     = BizgrowColors.PrimaryDark,

    secondary              = BizgrowColors.Secondary,
    onSecondary            = Color.White,
    secondaryContainer     = BizgrowColors.SecondaryContainer,
    onSecondaryContainer   = BizgrowColors.SecondaryDark,

    tertiary               = BizgrowColors.Warning,
    onTertiary             = Color.White,
    tertiaryContainer      = BizgrowColors.WarningLight,
    onTertiaryContainer    = BizgrowColors.WarningDark,

    background             = BizgrowColors.Background,
    onBackground           = BizgrowColors.Gray950,
    surface                = BizgrowColors.Surface,
    onSurface              = BizgrowColors.Gray900,
    surfaceVariant         = BizgrowColors.SurfaceVariant,
    onSurfaceVariant       = BizgrowColors.Gray700,
    outline                = BizgrowColors.Gray200,
    outlineVariant         = BizgrowColors.Gray100,

    error                  = BizgrowColors.Danger,
    onError                = Color.White,
    errorContainer         = BizgrowColors.DangerLight,
    onErrorContainer       = BizgrowColors.DangerDark,

    inverseSurface         = BizgrowColors.Gray900,
    inverseOnSurface       = BizgrowColors.Gray100,
    inversePrimary         = BizgrowColors.PrimaryMid,

    scrim                  = Color(0xFF000000),
)

private val DarkColors = darkColorScheme(
    primary                = Color(0xFF818CF8),
    onPrimary              = Color(0xFF1E1B4B),
    primaryContainer       = Color(0xFF3730A3),
    onPrimaryContainer     = Color(0xFFC7D2FE),

    secondary              = Color(0xFF34D399),
    onSecondary            = Color(0xFF022C22),
    secondaryContainer     = Color(0xFF065F46),
    onSecondaryContainer   = Color(0xFFA7F3D0),

    background             = Color(0xFF111827),
    onBackground           = Color(0xFFF9FAFB),
    surface                = Color(0xFF1F2937),
    onSurface              = Color(0xFFF3F4F6),
    surfaceVariant         = Color(0xFF374151),
    onSurfaceVariant       = Color(0xFFD1D5DB),
    outline                = Color(0xFF4B5563),
    outlineVariant         = Color(0xFF374151),

    error                  = Color(0xFFF87171),
    onError                = Color(0xFF7F1D1D),
    errorContainer         = Color(0xFF991B1B),
    onErrorContainer       = Color(0xFFFECACA),
)

// ─── Typography ──────────────────────────────────────────────────────────────
val BizgrowTypography = Typography(
    displayLarge   = TextStyle(fontWeight = FontWeight.ExtraBold, fontSize = 32.sp, letterSpacing = (-1.5).sp, lineHeight = 40.sp),
    headlineLarge  = TextStyle(fontWeight = FontWeight.Bold,      fontSize = 26.sp, letterSpacing = (-0.5).sp, lineHeight = 34.sp),
    headlineMedium = TextStyle(fontWeight = FontWeight.Bold,      fontSize = 22.sp, letterSpacing = (-0.3).sp, lineHeight = 30.sp),
    headlineSmall  = TextStyle(fontWeight = FontWeight.SemiBold,  fontSize = 18.sp, letterSpacing = 0.sp,     lineHeight = 26.sp),
    titleLarge     = TextStyle(fontWeight = FontWeight.Bold,      fontSize = 17.sp, letterSpacing = 0.sp,     lineHeight = 24.sp),
    titleMedium    = TextStyle(fontWeight = FontWeight.SemiBold,  fontSize = 15.sp, letterSpacing = 0.1.sp,   lineHeight = 22.sp),
    titleSmall     = TextStyle(fontWeight = FontWeight.Medium,    fontSize = 13.sp, letterSpacing = 0.1.sp,   lineHeight = 20.sp),
    bodyLarge      = TextStyle(fontWeight = FontWeight.Normal,    fontSize = 15.sp, letterSpacing = 0.sp,     lineHeight = 24.sp),
    bodyMedium     = TextStyle(fontWeight = FontWeight.Normal,    fontSize = 13.sp, letterSpacing = 0.2.sp,   lineHeight = 20.sp),
    bodySmall      = TextStyle(fontWeight = FontWeight.Normal,    fontSize = 11.sp, letterSpacing = 0.3.sp,   lineHeight = 16.sp),
    labelLarge     = TextStyle(fontWeight = FontWeight.SemiBold,  fontSize = 13.sp, letterSpacing = 0.1.sp),
    labelMedium    = TextStyle(fontWeight = FontWeight.Medium,    fontSize = 11.sp, letterSpacing = 0.4.sp),
    labelSmall     = TextStyle(fontWeight = FontWeight.Medium,    fontSize = 10.sp, letterSpacing = 0.5.sp),
)

// ─── Shapes ──────────────────────────────────────────────────────────────────
val BizgrowShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small      = RoundedCornerShape(8.dp),
    medium     = RoundedCornerShape(20.dp),
    large      = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(32.dp),
)

@Composable
fun BizgrowTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography  = BizgrowTypography,
        shapes      = BizgrowShapes,
        content     = content
    )
}
