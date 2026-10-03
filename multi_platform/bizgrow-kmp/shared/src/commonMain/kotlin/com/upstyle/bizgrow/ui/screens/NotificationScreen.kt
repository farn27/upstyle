package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.upstyle.bizgrow.data.RiwayatAksi
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen

// ─── Category tab config ────────────────────────────────────────────────────

private data class NotifCategory(
    val label: String,
    val kategoriKey: String?,      // null = "Semua" (no filter)
    val icon: ImageVector,
)

private val NOTIF_CATEGORIES = listOf(
    NotifCategory("Semua",    null,        Icons.Default.Notifications),
    NotifCategory("Produk",   "Produk",    Icons.Default.Inventory2),
    NotifCategory("Keuangan", "Keuangan",  Icons.Default.AccountBalanceWallet),
    NotifCategory("HR",       "HR",        Icons.Default.People),
    NotifCategory("Sistem",   "Sistem",    Icons.Default.Settings),
)

// ─── Deep-link helper ───────────────────────────────────────────────────────

private fun resolveDeepLink(notif: RiwayatAksi): Screen? {
    // Prefer explicit link field, fall back to tipe
    val target = notif.link?.lowercase() ?: notif.tipe.lowercase()
    return when {
        target.contains("produk") || target.contains("product") || target.contains("stok") -> Screen.Products
        target.contains("pos")                                                              -> Screen.Pos
        target.contains("finance") || target.contains("keuangan") ||
            target.contains("transaksi") || target.contains("hutang") ||
            target.contains("piutang")                                                      -> Screen.Finance
        target.contains("hr") || target.contains("karyawan") ||
            target.contains("absensi") || target.contains("payroll")                        -> Screen.Hr
        target.contains("order") || target.contains("pesanan")                             -> Screen.Orders
        else                                                                                -> null
    }
}

// ─── Screen ─────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationScreen(viewModel: AppViewModel) {
    val allNotifications by viewModel.notifications.collectAsState()

    var selectedIndex by remember { mutableStateOf(0) }
    val selectedCategory = NOTIF_CATEGORIES[selectedIndex]

    val filtered = remember(allNotifications, selectedIndex) {
        val key = selectedCategory.kategoriKey
        if (key == null) allNotifications
        else allNotifications.filter { it.kategori.equals(key, ignoreCase = true) }
    }

    LaunchedEffect(Unit) {
        viewModel.loadNotifications()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifikasi", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                actions = {
                    TextButton(onClick = { viewModel.markAllNotificationsRead() }) {
                        Text("Tandai Semua Dibaca", fontSize = 12.sp)
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {

            // ── Category tabs with per-tab unread badge ──────────────────────
            ScrollableTabRow(
                selectedTabIndex = selectedIndex,
                edgePadding = 8.dp
            ) {
                NOTIF_CATEGORIES.forEachIndexed { index, category ->
                    val unreadCount = if (category.kategoriKey == null) {
                        allNotifications.count { it.isRead == 0 }
                    } else {
                        allNotifications.count {
                            it.kategori.equals(category.kategoriKey, ignoreCase = true) && it.isRead == 0
                        }
                    }
                    Tab(
                        selected = selectedIndex == index,
                        onClick = { selectedIndex = index },
                        text = {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(category.label)
                                if (unreadCount > 0) {
                                    Badge { Text(unreadCount.toString()) }
                                }
                            }
                        }
                    )
                }
            }

            // ── Content ─────────────────────────────────────────────────────
            if (filtered.isEmpty()) {
                EmptyNotificationState()
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(filtered, key = { it.id }) { notif ->
                        NotificationItem(
                            notif = notif,
                            onTap = {
                                viewModel.markNotifRead(notif.id)
                                resolveDeepLink(notif)?.let { viewModel.navigate(it) }
                            },
                            onSwipeDismiss = {
                                viewModel.markNotifRead(notif.id)
                            }
                        )
                    }
                    item { Spacer(Modifier.height(16.dp)) }
                }
            }
        }
    }
}

// ─── Empty state ─────────────────────────────────────────────────────────────

@Composable
private fun EmptyNotificationState() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Default.NotificationsNone,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Tidak ada notifikasi",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Semua notifikasi sudah terbaca",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
            )
        }
    }
}

// ─── Notification item with swipe-to-dismiss ─────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotificationItem(
    notif: RiwayatAksi,
    onTap: () -> Unit,
    onSwipeDismiss: () -> Unit,
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) {
                onSwipeDismiss()
                true
            } else false
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        backgroundContent = {
            // Red background revealed on swipe left
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.errorContainer)
                    .padding(end = 20.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        "Tandai dibaca",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                    Icon(
                        Icons.Default.DoneAll,
                        contentDescription = "Tandai dibaca",
                        tint = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }
        }
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onTap),
            colors = CardDefaults.cardColors(
                containerColor = if (notif.isRead == 0)
                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f)
                else
                    MaterialTheme.colorScheme.surface
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = if (notif.isRead == 0) 1.dp else 0.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.Top
            ) {
                // Unread dot indicator
                Box(modifier = Modifier.width(16.dp), contentAlignment = Alignment.TopCenter) {
                    if (notif.isRead == 0) {
                        Box(
                            modifier = Modifier
                                .padding(top = 6.dp)
                                .size(8.dp)
                                .background(MaterialTheme.colorScheme.primary, shape = CircleShape)
                        )
                    }
                }

                Spacer(Modifier.width(4.dp))

                // Category icon
                Icon(
                    imageVector = categoryIcon(notif.kategori),
                    contentDescription = null,
                    modifier = Modifier
                        .padding(top = 2.dp)
                        .size(18.dp),
                    tint = if (notif.isRead == 0)
                        MaterialTheme.colorScheme.primary
                    else
                        MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(Modifier.width(10.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = notif.pesan,
                        fontWeight = if (notif.isRead == 0) FontWeight.SemiBold else FontWeight.Normal,
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    )
                    Spacer(Modifier.height(3.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (notif.kategori.isNotEmpty()) {
                            Text(
                                text = notif.kategori,
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Medium
                            )
                            Text("·", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text(
                            text = notif.waktu,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

// ─── Helper: map kategori → icon ────────────────────────────────────────────

private fun categoryIcon(kategori: String): ImageVector = when {
    kategori.equals("Produk",   ignoreCase = true) -> Icons.Default.Inventory2
    kategori.equals("Keuangan", ignoreCase = true) -> Icons.Default.AccountBalanceWallet
    kategori.equals("HR",       ignoreCase = true) -> Icons.Default.People
    kategori.equals("Sistem",   ignoreCase = true) -> Icons.Default.Settings
    else                                            -> Icons.Default.Notifications
}
