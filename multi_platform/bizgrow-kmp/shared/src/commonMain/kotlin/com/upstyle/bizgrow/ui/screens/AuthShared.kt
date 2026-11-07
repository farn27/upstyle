package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/**
 * Pesan error yang ramah. Error teknis jaringan (timeout, host tidak ditemukan) diterjemahkan
 * menjadi petunjuk yang bisa ditindaklanjuti pengguna.
 */
fun pesanRamah(raw: String?): String? {
    if (raw.isNullOrBlank()) return null
    val m = raw.lowercase()
    return when {
        "timeout" in m || "timed out" in m ->
            "Server tidak merespons. Periksa koneksi internet, atau coba jaringan lain (WiFi / data seluler)."
        "unable to resolve host" in m || "unknownhost" in m || "no address associated" in m ->
            "Tidak bisa terhubung ke server. Pastikan internet aktif."
        "failed to connect" in m || "connection refused" in m || "econnrefused" in m ->
            "Gagal terhubung ke server. Coba lagi beberapa saat."
        "ssl" in m || "certificate" in m ->
            "Koneksi aman gagal. Periksa jam & tanggal di HP, lalu coba lagi."
        else -> raw
    }
}

/** Hero bergradien dengan logo & orb dekoratif yang bergerak pelan (satu transisi saja). */
@Composable
fun AuthHero(title: String, subtitle: String, modifier: Modifier = Modifier, height: androidx.compose.ui.unit.Dp = 300.dp) {
    val orb = rememberInfiniteTransition(label = "orb")
    val geser by orb.animateFloat(-18f, 18f, infiniteRepeatable(tween(5200, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "geser")
    Box(
        modifier
            .fillMaxWidth()
            .height(height)
            .background(Brush.linearGradient(BizgrowColors.GradNight))
    ) {
        Box(
            Modifier.size(260.dp).align(Alignment.TopEnd).offset(x = 90.dp, y = (-80).dp)
                .graphicsLayer { translationX = geser * 2; translationY = -geser }
                .clip(CircleShape).background(Color.White.copy(alpha = 0.09f))
        )
        Box(
            Modifier.size(170.dp).align(Alignment.CenterStart).offset(x = (-70).dp, y = 30.dp)
                .graphicsLayer { translationY = geser * 1.5f }
                .clip(CircleShape).background(Color(0xFFEC4899).copy(alpha = 0.18f))
        )
        Column(
            Modifier.align(Alignment.BottomStart).statusBarsPadding().padding(start = 26.dp, end = 26.dp, bottom = 56.dp)
        ) {
            Box(
                Modifier.size(52.dp).clip(RoundedCornerShape(16.dp)).background(Color.White.copy(alpha = 0.18f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.AutoMirrored.Rounded.TrendingUp, null, tint = Color.White, modifier = Modifier.size(28.dp))
            }
            Spacer(Modifier.height(18.dp))
            Text(title, style = MaterialTheme.typography.displaySmall, color = Color.White)
            Spacer(Modifier.height(6.dp))
            Text(subtitle, style = MaterialTheme.typography.bodyLarge, color = Color.White.copy(alpha = 0.78f))
        }
    }
}

@Composable
fun AuthErrorBanner(message: String?) {
    androidx.compose.animation.AnimatedVisibility(
        visible = message != null,
        enter = androidx.compose.animation.expandVertically() + androidx.compose.animation.fadeIn(),
        exit = androidx.compose.animation.shrinkVertically() + androidx.compose.animation.fadeOut()
    ) {
        var terakhir by remember { mutableStateOf(message ?: "") }
        if (message != null) terakhir = message
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(BizgrowColors.DangerLight)
                .padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(Icons.Rounded.ErrorOutline, null, tint = BizgrowColors.Danger, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text(terakhir, style = MaterialTheme.typography.bodyMedium, color = BizgrowColors.Danger)
        }
    }
}
