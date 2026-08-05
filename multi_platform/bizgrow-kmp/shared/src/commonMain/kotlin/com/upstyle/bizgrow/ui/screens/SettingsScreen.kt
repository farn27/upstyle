package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.components.BizCard
import com.upstyle.bizgrow.ui.components.InfoRow
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(viewModel: AppViewModel) {
    val activeUnit by viewModel.activeUnit.collectAsState(initial = viewModel.activeUnit.value)
    val session = viewModel.session

    var serverUrl by remember { mutableStateOf(session.getServerUrl()) }
    var showServerDialog by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }
    var serverUrlInput by remember { mutableStateOf(serverUrl) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pengaturan", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {

            item { Spacer(Modifier.height(8.dp)) }

            // Unit aktif
            item {
                SettingsSection("Unit Bisnis Aktif") {
                    if (activeUnit != null) {
                        InfoRow("Nama", activeUnit!!.name, Icons.Default.Business)
                        InfoRow("Tipe", activeUnit!!.type.uppercase(), Icons.Default.Category)
                        // if (activeUnit!!.alamat != null) InfoRow("Alamat", activeUnit!!.alamat!!, Icons.Default.LocationOn)
                    } else {
                        Text("Tidak ada unit aktif", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(Modifier.height(4.dp))
                    OutlinedButton(onClick = { viewModel.navigateToRoot(Screen.Home) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Default.SwapHoriz, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Ganti Unit Bisnis")
                    }
                }
            }

            // Koneksi server
            item {
                SettingsSection("Koneksi Server") {
                    InfoRow("URL Server", serverUrl, Icons.Default.Cloud)
                    Spacer(Modifier.height(4.dp))
                    OutlinedButton(onClick = { serverUrlInput = serverUrl; showServerDialog = true }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Default.Edit, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Ubah URL Server")
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Tips: Emulator Android â†’ http://10.0.2.2:5173 | Perangkat fisik â†’ gunakan IP LAN komputer | USB Debugging â†’ jalankan: adb reverse tcp:5173 tcp:5173 lalu gunakan http://localhost:5173",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Profil
            item {
                SettingsSection("Akun") {
                    InfoRow("Username", session.getUsername(), Icons.Default.Person)
                    InfoRow("Email", session.getEmail(), Icons.Default.Email)
                    InfoRow("Role", session.getRole().uppercase(), Icons.Default.Badge)
                    Spacer(Modifier.height(4.dp))
                    OutlinedButton(onClick = { viewModel.navigate(Screen.Profile) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Default.ManageAccounts, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Edit Profil")
                    }
                }
            }

            // Navigasi cepat
            item {
                SettingsSection("Fitur Bisnis") {
                    SettingsNavItem("POS Shift", Icons.Default.Schedule, "Kelola buka/tutup shift kasir") { viewModel.navigate(Screen.PosShift) }
                    SettingsNavItem("Laporan WA", Icons.Default.Message, "Generate ringkasan bisnis via WA") { viewModel.navigate(Screen.LaporanWa) }
                    SettingsNavItem("Notifikasi", Icons.Default.Notifications, "Riwayat aktivitas & notifikasi") { viewModel.navigate(Screen.Notifications) }
                    SettingsNavItem("AI Assistant", Icons.Default.AutoAwesome, "Chat dengan AI bisnis Anda") { viewModel.navigate(Screen.AiChat) }
                    SettingsNavItem("Business Plan", Icons.Default.Assignment, "Kelola rencana bisnis") { viewModel.navigate(Screen.BusinessPlan) }
                    SettingsNavItem("Katalog Online", Icons.Default.Store, "Kelola toko online Anda") { viewModel.navigate(Screen.Katalog) }
                    SettingsNavItem("Sosial Media", Icons.Default.Share, "Jadwalkan & kelola postingan") { viewModel.navigate(Screen.Sosmed) }
                    SettingsNavItem("Website Builder", Icons.Default.Public, "Kelola website bisnis Anda") { viewModel.navigate(Screen.WebsiteBuilder) }
                    SettingsNavItem("Landing Page", Icons.Default.WebAsset, "Kelola landing page") { viewModel.navigate(Screen.LandingPageScreen) }
                    SettingsNavItem("Shopee Integration", Icons.Default.ShoppingCart, "Hubungkan toko Shopee") { viewModel.navigate(Screen.ShopeeIntegrationScreen) }
                    SettingsNavItem("Pusat Bantuan", Icons.Default.Help, "FAQ & panduan penggunaan") { viewModel.navigate(Screen.HelpCenter) }
                    SettingsNavItem("Pengaturan Lanjutan", Icons.Default.Settings, "Preferensi & keamanan akun") { viewModel.navigate(Screen.AdvancedSettings) }
                }
            }

            // Danger zone
            item {
                BizCard {
                    Button(
                        onClick = { showLogoutDialog = true },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(20.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Danger)
                    ) {
                        Icon(Icons.Default.Logout, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Keluar dari Akun", fontWeight = FontWeight.Bold)
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    // Dialog ubah server URL
    if (showServerDialog) {
        AlertDialog(
            onDismissRequest = { showServerDialog = false },
            title = { Text("Ubah URL Server", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = serverUrlInput,
                        onValueChange = { serverUrlInput = it },
                        label = { Text("URL Server") },
                        placeholder = { Text("http://10.0.2.2:5173") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        singleLine = true
                    )
                    Text("Contoh: http://10.0.2.2:5173 (emulator) atau http://192.168.1.x:5173 (WiFi)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = {
                Button(onClick = {
                    val url = serverUrlInput.trimEnd('/')
                    session.setServerUrl(url)
                    serverUrl = url
                    showServerDialog = false
                }) { Text("Simpan") }
            },
            dismissButton = { TextButton(onClick = { showServerDialog = false }) { Text("Batal") } }
        )
    }

    // Dialog konfirmasi logout
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Konfirmasi Keluar", fontWeight = FontWeight.Bold) },
            text = { Text("Anda akan keluar dari akun ini. Data lokal tidak akan dihapus.") },
            confirmButton = {
                Button(onClick = { viewModel.logout() }, colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Danger)) { Text("Keluar") }
            },
            dismissButton = { TextButton(onClick = { showLogoutDialog = false }) { Text("Batal") } }
        )
    }
}

@Composable
fun SettingsSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column {
        Text(title, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
        Card(shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth(), elevation = CardDefaults.cardElevation(2.dp)) {
            Column(modifier = Modifier.padding(16.dp), content = content)
        }
    }
}

@Composable
fun SettingsNavItem(label: String, icon: ImageVector, subtitle: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(label, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
