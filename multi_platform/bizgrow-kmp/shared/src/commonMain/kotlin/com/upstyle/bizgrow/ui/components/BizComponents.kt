package com.upstyle.bizgrow.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Inbox
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

// Komponen lama — sekarang memakai design system v2 (ui/design) agar layar lama ikut konsisten.
// Signature dipertahankan supaya pemanggil tidak perlu diubah.

@Composable
fun StatCard(
    title: String,
    value: String,
    subtitle: String? = null,
    icon: ImageVector,
    gradient: List<Color> = BizgrowColors.GradPrimary,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    GradientCard(modifier, colors = gradient, shape = RoundedCornerShape(22.dp), contentPadding = PaddingValues(16.dp), onClick = onClick) {
        Column {
            Icon(icon, null, tint = Color.White.copy(alpha = 0.9f), modifier = Modifier.size(22.dp))
            Spacer(Modifier.height(10.dp))
            Text(title, style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f), maxLines = 1)
            Text(value, style = MaterialTheme.typography.titleLarge, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.75f), maxLines = 1)
        }
    }
}

@Composable
fun MenuCard(
    label: String,
    icon: ImageVector,
    gradient: List<Color>,
    badge: String? = null,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    ModuleTile(label, icon, gradient.last(), modifier, badge, onClick)
}

@Composable
fun SectionHeader(
    title: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    SectionTitle(title, Modifier.padding(vertical = 4.dp), actionLabel = actionLabel, onAction = onAction)
}

@Composable
fun StatusBadge(status: String, modifier: Modifier = Modifier) {
    val warna = when (status.uppercase()) {
        "MASUK", "PAID", "LUNAS", "ACTIVE", "AKTIF", "HADIR", "SUCCESS", "RECEIVED", "COMPLETED", "SELESAI", "APPROVED", "WON" -> BizgrowColors.Success
        "KELUAR", "OVERDUE", "ALFA", "ERROR", "FAILED", "CANCELLED", "REJECTED", "LOST", "MACET" -> BizgrowColors.Danger
        "PENDING", "DRAFT", "IZIN", "SEBAGIAN", "BELUM_BAYAR", "OPEN", "PROCESSING" -> BizgrowColors.Warning
        "SENT", "IN_PROGRESS", "SHIPPED" -> BizgrowColors.Info
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    StatusChip(status.replace('_', ' '), warna, modifier)
}

@Composable
fun InfoRow(label: String, value: String, icon: ImageVector? = null) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 7.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            icon?.let {
                Icon(it, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.width(12.dp))
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
fun EmptyState(
    icon: ImageVector = Icons.Rounded.Inbox,
    title: String = "Belum ada data",
    subtitle: String? = null,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    EmptyView(title, subtitle, icon, actionLabel, onAction)
}

@Composable
fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    icon: ImageVector = Icons.Rounded.ErrorOutline,
    modifier: Modifier = Modifier
) {
    EmptyView("Terjadi kendala", message, icon, "Coba lagi", onRetry, modifier)
}

@Composable
fun LoadingShimmer(modifier: Modifier = Modifier) {
    LazyColumn(modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(vertical = 16.dp)) {
        item { SkeletonList(rows = 7) }
    }
}

@Composable
fun ShimmerBox(modifier: Modifier = Modifier, cornerRadius: Dp = 12.dp) {
    SkeletonBlock(modifier, RoundedCornerShape(cornerRadius))
}

@Composable
fun BizCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    BizSurface(modifier = modifier, onClick = onClick, content = content)
}

fun Double.toRupiah(): String = rupiah()
fun Long.toRupiah(): String = toDouble().rupiah()
fun Int.toRupiah(): String = toDouble().rupiah()
