package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@Composable
fun SettingsScreen(viewModel: AppViewModel) {
    val activeUnit by viewModel.activeUnit.collectAsState(initial = viewModel.activeUnit.value)
    val themeMode by viewModel.themeMode.collectAsState(initial = viewModel.themeMode.value)
    val prefs by viewModel.advancedSettingsState.collectAsState(initial = viewModel.advancedSettingsState.value)
    val session = viewModel.session
    var serverUrl by remember { mutableStateOf(session.getServerUrl()) }
    var showServerDialog by remember { mutableStateOf(false) }
    var serverInput by remember { mutableStateOf(serverUrl) }
    var konfirmasiKeluar by remember { mutableStateOf(false) }

    BizScreen(title = "Pengaturan", subtitle = activeUnit?.name, onBack = { viewModel.navigateBack() }) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            item {
                Column(Modifier.enterAnimation(0)) {
                    Text("TAMPILAN", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 6.dp, bottom = 8.dp))
                    ThemeSelector(themeMode, { viewModel.setThemeMode(it) })
                }
            }
            item {
                Column(Modifier.enterAnimation(1)) {
                    Text("PREFERENSI", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 6.dp, bottom = 8.dp))
                    BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)) {
                        ListRow(
                            title = "Notifikasi",
                            subtitle = "Info stok menipis, transaksi, dan tagihan",
                            icon = Icons.Rounded.NotificationsActive,
                            tint = BizgrowColors.Danger,
                            trailing = {
                                Switch(
                                    checked = prefs.notifEnabled,
                                    onCheckedChange = { viewModel.updatePreferences(themeMode == "dark", it) }
                                )
                            }
                        )
                    }
                }
            }
            item {
                MenuGroup(
                    "Unit bisnis",
                    listOf(
                        MenuItem("Ganti unit aktif", Icons.Rounded.SwapHoriz, BizgrowColors.Primary, activeUnit?.name ?: "Belum dipilih") { viewModel.navigateToRoot(Screen.Home) },
                        MenuItem("Kelola unit", Icons.Rounded.Business, BizgrowColors.Info) { viewModel.navigate(Screen.Units) },
                        MenuItem("Shift kasir", Icons.Rounded.Schedule, BizgrowColors.Success) { viewModel.navigate(Screen.PosShift) },
                        MenuItem("Laporan via WhatsApp", Icons.Rounded.Forum, Color(0xFF14B8A6)) { viewModel.navigate(Screen.LaporanWa) },
                    ),
                    Modifier.enterAnimation(2)
                )
            }
            item {
                MenuGroup(
                    "Akun & keamanan",
                    listOf(
                        MenuItem("Profil & password", Icons.Rounded.ManageAccounts, BizgrowColors.Violet) { viewModel.navigate(Screen.AdvancedSettings) },
                        MenuItem("Paket langganan", Icons.Rounded.WorkspacePremium, BizgrowColors.Warning) { viewModel.navigate(Screen.SubscriptionPlans) },
                    ),
                    Modifier.enterAnimation(3)
                )
            }
            item {
                Column(Modifier.enterAnimation(4)) {
                    Text("KONEKSI", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 6.dp, bottom = 8.dp))
                    BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)) {
                        ListRow(
                            title = "Alamat server",
                            subtitle = serverUrl,
                            icon = Icons.Rounded.Dns,
                            tint = BizgrowColors.Info,
                            showChevron = true,
                            onClick = { serverInput = serverUrl; showServerDialog = true }
                        )
                        ListRow(
                            title = "Diagnostik koneksi",
                            subtitle = "Cek server, sesi, dan sinkronisasi",
                            icon = Icons.Rounded.MonitorHeart,
                            tint = BizgrowColors.Success,
                            showChevron = true,
                            onClick = { viewModel.navigate(Screen.Diagnostics) }
                        )
                    }
                }
            }
            item {
                BizOutlineButton("Keluar", { konfirmasiKeluar = true }, icon = Icons.AutoMirrored.Rounded.Logout, tint = BizgrowColors.Danger, modifier = Modifier.fillMaxWidth())
            }
        }
    }

    if (showServerDialog) {
        AlertDialog(
        // formulir: ketuk di luar dialog tidak menutup (isian tidak hilang tanpa sengaja)
        properties = androidx.compose.ui.window.DialogProperties(dismissOnClickOutside = false),
            onDismissRequest = { showServerDialog = false },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            icon = { IconBadge(Icons.Rounded.Dns, MaterialTheme.colorScheme.primary) },
            title = { Text("Alamat server") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Untuk pengembangan: emulator → http://10.0.2.2:5173, perangkat fisik → IP komputer di jaringan yang sama.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    BizTextField(serverInput, { serverInput = it }, "URL server", keyboardType = KeyboardType.Uri, imeAction = ImeAction.Done)
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val baru = serverInput.trim().trimEnd('/')
                    if (baru.isNotEmpty()) {
                        session.setServerUrl(baru)
                        serverUrl = baru
                    }
                    showServerDialog = false
                }) { Text("Simpan") }
            },
            dismissButton = { TextButton(onClick = { showServerDialog = false }) { Text("Batal") } }
        )
    }

    if (konfirmasiKeluar) {
        AlertDialog(
            onDismissRequest = { konfirmasiKeluar = false },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            icon = { IconBadge(Icons.AutoMirrored.Rounded.Logout, BizgrowColors.Danger) },
            title = { Text("Keluar dari akun?") },
            confirmButton = {
                TextButton(onClick = { konfirmasiKeluar = false; viewModel.logout() }) {
                    Text("Keluar", color = BizgrowColors.Danger, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = { TextButton(onClick = { konfirmasiKeluar = false }) { Text("Batal") } }
        )
    }
}
