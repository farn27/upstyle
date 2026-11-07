package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/** Tab "Akun": profil, paket, tampilan, dan pintasan pengaturan. */
@Composable
fun ProfileScreen(viewModel: AppViewModel) {
    val activeUnit by viewModel.activeUnit.collectAsState(initial = viewModel.activeUnit.value)
    val units by viewModel.units.collectAsState(initial = viewModel.units.value)
    val themeMode by viewModel.themeMode.collectAsState(initial = viewModel.themeMode.value)
    val unread by viewModel.unreadCount.collectAsState(initial = viewModel.unreadCount.value)
    val user = viewModel.currentUser
    var konfirmasiKeluar by remember { mutableStateOf(false) }
    val paket = labelPaket(user?.role)

    androidx.compose.material3.Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = { BottomNavBar(viewModel, Screen.Profile) }
    ) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(bottom = padding.calculateBottomPadding()),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            item {
                GradientCard(
                    colors = BizgrowColors.GradNight,
                    shape = RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp),
                    contentPadding = PaddingValues(0.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.statusBarsPadding().padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Akun", style = MaterialTheme.typography.titleLarge, color = Color.White, modifier = Modifier.weight(1f))
                            BizIconButton(Icons.Rounded.Settings, "Pengaturan", tint = Color.White, container = Color.White.copy(alpha = 0.16f)) {
                                viewModel.navigate(Screen.Settings)
                            }
                        }
                        Spacer(Modifier.height(18.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier.size(64.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.22f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text((user?.username?.firstOrNull() ?: 'B').uppercase(), style = MaterialTheme.typography.headlineMedium, color = Color.White)
                            }
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(user?.username ?: "Pengguna", style = MaterialTheme.typography.titleLarge, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(user?.email ?: "", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.75f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Spacer(Modifier.height(6.dp))
                                Row(
                                    Modifier.clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = 0.2f)).padding(horizontal = 10.dp, vertical = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Rounded.WorkspacePremium, null, tint = Color(0xFFFDE68A), modifier = Modifier.size(14.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Paket $paket", style = MaterialTheme.typography.labelSmall, color = Color.White)
                                }
                            }
                        }
                        if (paket == "Gratis") {
                            Spacer(Modifier.height(18.dp))
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(Color.White.copy(alpha = 0.14f))
                                    .pressClick { viewModel.navigate(Screen.SubscriptionPlans) }
                                    .padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Rounded.RocketLaunch, null, tint = Color.White)
                                Spacer(Modifier.width(10.dp))
                                Column(Modifier.weight(1f)) {
                                    Text("Upgrade ke Pro", style = MaterialTheme.typography.titleSmall, color = Color.White)
                                    Text("Hingga 10 unit bisnis & fitur lengkap", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.75f))
                                }
                                Icon(Icons.Rounded.ChevronRight, null, tint = Color.White)
                            }
                        }
                    }
                }
            }

            item {
                Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
                    Spacer(Modifier.height(2.dp))
                    BizSurface(Modifier.fillMaxWidth().enterAnimation(0), onClick = { viewModel.navigateToRoot(Screen.Home) }) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            val kat = kategoriDari(activeUnit?.type)
                            IconBadge(kat.icon, kat.tint)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text("Unit aktif", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(activeUnit?.name ?: "Belum dipilih", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("${units.size} unit terdaftar", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            StatusChip("Ganti", MaterialTheme.colorScheme.primary)
                        }
                    }

                    Column(Modifier.enterAnimation(1)) {
                        Text("TAMPILAN", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 6.dp, bottom = 8.dp))
                        ThemeSelector(themeMode, { viewModel.setThemeMode(it) })
                    }

                    MenuGroup(
                        "Akun & langganan",
                        listOf(
                            MenuItem("Profil & keamanan", Icons.Rounded.ManageAccounts, BizgrowColors.Primary, "Nama, email, password") { viewModel.navigate(Screen.AdvancedSettings) },
                            MenuItem("Paket langganan", Icons.Rounded.WorkspacePremium, BizgrowColors.Warning, trailingText = paket) { viewModel.navigate(Screen.SubscriptionPlans) },
                            MenuItem("Riwayat tagihan", Icons.AutoMirrored.Rounded.ReceiptLong, BizgrowColors.Success) { viewModel.navigate(Screen.InvoiceHistory) },
                            MenuItem("Pemakaian & kuota", Icons.Rounded.DataUsage, BizgrowColors.Info) { viewModel.navigate(Screen.UsageMetrics) },
                        ),
                        Modifier.enterAnimation(2)
                    )

                    MenuGroup(
                        "Bisnis",
                        listOf(
                            MenuItem("Notifikasi", Icons.Rounded.Notifications, BizgrowColors.Danger, trailingText = if (unread > 0) "$unread baru" else null) { viewModel.navigate(Screen.Notifications) },
                            MenuItem("Unit bisnis", Icons.Rounded.Business, BizgrowColors.Primary) { viewModel.navigate(Screen.Units) },
                            MenuItem("Ekspor / impor data", Icons.Rounded.ImportExport, Color(0xFF14B8A6)) { viewModel.navigate(Screen.ExportImport) },
                            MenuItem("Sinkronisasi offline", Icons.Rounded.CloudSync, BizgrowColors.Violet) { viewModel.navigate(Screen.SyncStatus) },
                        ),
                        Modifier.enterAnimation(3)
                    )

                    MenuGroup(
                        "Bantuan",
                        listOf(
                            MenuItem("Pusat bantuan", Icons.Rounded.HelpOutline, BizgrowColors.Info) { viewModel.navigate(Screen.HelpCenter) },
                            MenuItem("Diagnostik koneksi", Icons.Rounded.MonitorHeart, BizgrowColors.Success) { viewModel.navigate(Screen.Diagnostics) },
                        ),
                        Modifier.enterAnimation(4)
                    )

                    BizOutlineButton(
                        "Keluar",
                        onClick = { konfirmasiKeluar = true },
                        icon = Icons.AutoMirrored.Rounded.Logout,
                        tint = BizgrowColors.Danger,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text(
                        "Bizgrow • versi 1.0",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    )
                }
            }
        }
    }

    if (konfirmasiKeluar) {
        AlertDialog(
            onDismissRequest = { konfirmasiKeluar = false },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            icon = { IconBadge(Icons.AutoMirrored.Rounded.Logout, BizgrowColors.Danger) },
            title = { Text("Keluar dari akun?") },
            text = { Text("Kamu perlu masuk lagi untuk mengelola ${user?.email ?: "akun ini"}.") },
            confirmButton = {
                TextButton(onClick = { konfirmasiKeluar = false; viewModel.logout() }) {
                    Text("Keluar", color = BizgrowColors.Danger, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = { TextButton(onClick = { konfirmasiKeluar = false }) { Text("Batal") } }
        )
    }
}
