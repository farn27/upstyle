package com.upstyle.bizgrow.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ─── Bizgrow Color Palette (Premium Upgrade) ─────────────────────────────────
object BizgrowColors {
    // A richer, more modern primary branding (Deep Royal / Indigo blend)
    val Primary       = Color(0xFF4338CA) // Deep Indigo
    val PrimaryDark   = Color(0xFF312E81)
    val PrimaryLight  = Color(0xFFEEF2FF)
    
    // Accents
    val Secondary     = Color(0xFF10B981) // Crisp Emerald
    val OnSecondary   = Color.White
    val SecondaryContainer = Color(0xFFD1FAE5)

    // Functional
    val Success       = Color(0xFF059669) 
    val SuccessLight  = Color(0xFFECFDF5) 
    val Warning       = Color(0xFFD97706) 
    val WarningLight  = Color(0xFFFFFBEB) 
    val Danger        = Color(0xFFE11D48) // Rose-600
    val DangerLight   = Color(0xFFFFF1F2) 
    
    // Neutrals / Surfaces
    val Slate900      = Color(0xFF0F172A)
    val Slate800      = Color(0xFF1E293B)
    val Slate700      = Color(0xFF334155)
    val Slate500      = Color(0xFF64748B)
    val Slate400      = Color(0xFF94A3B8)
    val Slate200      = Color(0xFFE2E8F0)
    val Slate100      = Color(0xFFF1F5F9)
    val Slate50       = Color(0xFFF8FAFC)
    val Background    = Color(0xFFF8FAFC) // Very light blue-grey for a modern app feel
    val Surface       = Color.White
    val SurfaceVariant= Color(0xFFF1F5F9)
    
    val White         = Color.White

    // Gradient pairs for premium cards
    val GradPrimary   = listOf(Color(0xFF4F46E5), Color(0xFF6366F1)) // Indigo pop
    val GradSuccess   = listOf(Color(0xFF059669), Color(0xFF10B981))
    val GradWarning   = listOf(Color(0xFFD97706), Color(0xFFF59E0B))
    val GradDanger    = listOf(Color(0xFFE11D48), Color(0xFFF43F5E))
    val GradDark      = listOf(Color(0xFF0F172A), Color(0xFF1E293B))
}

private val LightColors = lightColorScheme(
    primary            = BizgrowColors.Primary,
    onPrimary          = BizgrowColors.White,
    primaryContainer   = BizgrowColors.PrimaryLight,
    onPrimaryContainer = BizgrowColors.PrimaryDark,
    
    secondary          = BizgrowColors.Secondary,
    onSecondary        = BizgrowColors.OnSecondary,
    secondaryContainer = BizgrowColors.SecondaryContainer,
    onSecondaryContainer = BizgrowColors.Success,

    background         = BizgrowColors.Background,
    onBackground       = BizgrowColors.Slate900,
    surface            = BizgrowColors.Surface,
    onSurface          = BizgrowColors.Slate900,
    surfaceVariant     = BizgrowColors.SurfaceVariant,
    onSurfaceVariant   = BizgrowColors.Slate700,
    outline            = BizgrowColors.Slate200,
    
    error              = BizgrowColors.Danger,
    errorContainer     = BizgrowColors.DangerLight,
    onErrorContainer   = BizgrowColors.Danger,
)

private val DarkColors = darkColorScheme(
    primary            = Color(0xFF818CF8),
    onPrimary          = Color(0xFF1E1B4B),
    primaryContainer   = Color(0xFF312E81),
    onPrimaryContainer = Color(0xFFC7D2FE),
    background         = Color(0xFF0F172A),
    onBackground       = Color(0xFFF1F5F9),
    surface            = Color(0xFF1E293B),
    onSurface          = Color(0xFFF1F5F9),
    surfaceVariant     = Color(0xFF334155),
    onSurfaceVariant   = Color(0xFFCBD5E1),
    outline            = Color(0xFF475569),
    error              = Color(0xFFF87171),
    errorContainer     = Color(0xFF7F1D1D),
)

// Premium Typography Upgrade: tighter letter spacing, bolder headers.
val BizgrowTypography = Typography(
    displayLarge  = TextStyle(fontWeight = FontWeight.ExtraBold, fontSize = 34.sp, letterSpacing = (-1).sp),
    headlineLarge = TextStyle(fontWeight = FontWeight.Bold,      fontSize = 28.sp, letterSpacing = (-0.5).sp),
    headlineMedium= TextStyle(fontWeight = FontWeight.Bold,      fontSize = 24.sp, letterSpacing = (-0.5).sp),
    headlineSmall = TextStyle(fontWeight = FontWeight.SemiBold,  fontSize = 20.sp, letterSpacing = 0.sp),
    titleLarge    = TextStyle(fontWeight = FontWeight.Bold,      fontSize = 18.sp, letterSpacing = 0.sp),
    titleMedium   = TextStyle(fontWeight = FontWeight.SemiBold,  fontSize = 16.sp, letterSpacing = 0.1.sp),
    titleSmall    = TextStyle(fontWeight = FontWeight.Medium,    fontSize = 14.sp, letterSpacing = 0.1.sp),
    bodyLarge     = TextStyle(fontWeight = FontWeight.Normal,    fontSize = 16.sp, letterSpacing = 0.sp, lineHeight = 24.sp),
    bodyMedium    = TextStyle(fontWeight = FontWeight.Normal,    fontSize = 14.sp, letterSpacing = 0.2.sp, lineHeight = 20.sp),
    bodySmall     = TextStyle(fontWeight = FontWeight.Normal,    fontSize = 12.sp, letterSpacing = 0.4.sp, lineHeight = 16.sp),
    labelLarge    = TextStyle(fontWeight = FontWeight.SemiBold,  fontSize = 14.sp, letterSpacing = 0.1.sp),
    labelMedium   = TextStyle(fontWeight = FontWeight.Medium,    fontSize = 12.sp, letterSpacing = 0.5.sp),
    labelSmall    = TextStyle(fontWeight = FontWeight.Medium,    fontSize = 10.sp, letterSpacing = 0.5.sp),
)

@Composable
fun BizgrowTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography  = BizgrowTypography,
        // Optional: Custom shapes could go here for more rounded premium cards
        content     = content
    )
}
