package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.BrightnessAuto
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizMotion
import com.upstyle.bizgrow.ui.theme.LocalBizPalette

data class MenuItem(
    val label: String,
    val icon: ImageVector,
    val tint: Color,
    val subtitle: String? = null,
    val trailingText: String? = null,
    val onClick: () -> Unit
)

/** Grup menu dalam satu kartu, dipisah garis tipis. */
@Composable
fun MenuGroup(title: String, items: List<MenuItem>, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(
            title.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 6.dp, bottom = 8.dp)
        )
        BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)) {
            items.forEachIndexed { i, item ->
                ListRow(
                    title = item.label,
                    subtitle = item.subtitle,
                    icon = item.icon,
                    tint = item.tint,
                    showChevron = true,
                    trailing = item.trailingText?.let { t -> { Text(t, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) } },
                    onClick = item.onClick
                )
                if (i < items.lastIndex) HorizontalDivider(Modifier.padding(start = 58.dp), color = LocalBizPalette.current.border)
            }
        }
    }
}

/** Pilihan tema Sistem / Terang / Gelap (segmented). */
@Composable
fun ThemeSelector(mode: String, onChange: (String) -> Unit, modifier: Modifier = Modifier) {
    val pilihan = listOf(
        Triple("system", "Sistem", Icons.Rounded.BrightnessAuto),
        Triple("light", "Terang", Icons.Rounded.LightMode),
        Triple("dark", "Gelap", Icons.Rounded.DarkMode),
    )
    Row(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        pilihan.forEach { (kode, label, icon) ->
            val aktif = mode == kode
            val bg by animateColorAsState(if (aktif) MaterialTheme.colorScheme.surface else Color.Transparent, BizMotion.fast(), label = "tbg")
            val fg by animateColorAsState(if (aktif) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, BizMotion.fast(), label = "tfg")
            Row(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(bg)
                    .then(if (aktif) Modifier.border(1.dp, LocalBizPalette.current.border, RoundedCornerShape(12.dp)) else Modifier)
                    .pressClick { onChange(kode) }
                    .padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(icon, null, tint = fg, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text(label, style = MaterialTheme.typography.labelMedium, color = fg)
            }
        }
    }
}

fun labelPaket(role: String?): String = when (role?.lowercase()) {
    "pro" -> "Pro"
    "enterprise" -> "Enterprise"
    else -> "Gratis"
}
