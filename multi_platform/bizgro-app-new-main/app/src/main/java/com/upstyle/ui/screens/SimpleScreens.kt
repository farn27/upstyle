package com.upstyle.ui.screens

// Placeholder screens for modules not yet fully implemented
// They will show module name + navigation back to dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.ui.MainViewModel
import com.upstyle.ui.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductsScreen(viewModel: MainViewModel) {
    val products by viewModel.products.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { viewModel.loadProducts() }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Produk & Inventori", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(products) { p ->
                Card(shape = RoundedCornerShape(12.dp)) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(p.nama, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                            Text(p.kategori, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("Harga: Rp ${"%,.0f".format(p.hargaJual)}", style = MaterialTheme.typography.bodySmall)
                        }
                        Surface(
                            color = if (p.stok <= 5) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.primaryContainer,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("Stok: ${p.stok}", Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HrScreen(viewModel: MainViewModel) {
    val hrData by viewModel.hrData.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { viewModel.loadHrData() }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("HR & Karyawan", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            val employees = hrData?.employees ?: emptyList()
            item { Text("Karyawan (${employees.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
            items(employees) { emp ->
                Card(shape = RoundedCornerShape(12.dp)) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(8.dp), modifier = Modifier.size(40.dp)) {
                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Person, null, tint = MaterialTheme.colorScheme.primary) }
                        }
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(emp.fullName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                            Text("${emp.position} • ${emp.role}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("Gaji: Rp ${"%,.0f".format(emp.salary)}", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CrmScreen(viewModel: MainViewModel) {
    val deals by viewModel.crmDeals.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { viewModel.loadCrmDeals() }
    val stages = listOf("PROSPECT", "NEGOTIATION", "PROPOSAL", "WON", "LOST")
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("CRM Pipeline", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            stages.forEach { stage ->
                val stageDeals = deals.filter { it.stage.uppercase() == stage }
                if (stageDeals.isNotEmpty()) {
                    item { Text(stage, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary) }
                    items(stageDeals) { deal ->
                        Card(shape = RoundedCornerShape(12.dp)) {
                            Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(deal.contactName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                    Text(deal.companyName, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text("Rp ${"%,.0f".format(deal.dealValue)}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScmScreen(viewModel: MainViewModel) {
    val scmData by viewModel.scmData.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { viewModel.loadScmData() }
    var showTab by remember { mutableStateOf(0) }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SCM & Supplier", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = showTab) {
                Tab(selected = showTab == 0, onClick = { showTab = 0 }) { Text("Supplier", Modifier.padding(12.dp)) }
                Tab(selected = showTab == 1, onClick = { showTab = 1 }) { Text("Purchase Orders", Modifier.padding(12.dp)) }
            }
            if (showTab == 0) {
                LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val suppliers = scmData?.suppliers ?: emptyList()
                    items(suppliers) { s ->
                        Card(shape = RoundedCornerShape(12.dp)) {
                            Column(Modifier.padding(12.dp)) {
                                Text(s.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                Text("${s.contactName} • ${s.phone}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            } else {
                LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val pos = scmData?.purchaseOrders ?: emptyList()
                    items(pos) { po ->
                        Card(shape = RoundedCornerShape(12.dp)) {
                            Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(po.poNumber, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                    Text("${po.supplierName} • ${po.productName}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Surface(color = when(po.status) {
                                    "RECEIVED" -> MaterialTheme.colorScheme.primaryContainer
                                    "SENT" -> MaterialTheme.colorScheme.secondaryContainer
                                    else -> MaterialTheme.colorScheme.surfaceVariant
                                }, shape = RoundedCornerShape(6.dp)) {
                                    Text(po.status, Modifier.padding(horizontal = 8.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiChatScreen(viewModel: MainViewModel) {
    val messages by viewModel.chatMessages.collectAsStateWithLifecycle()
    val isLoading by viewModel.isAiLoading.collectAsStateWithLifecycle()
    var input by remember { mutableStateOf("") }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Bizgrow AI Assistant", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) { Icon(Icons.Default.ArrowBack, null) } },
                actions = { IconButton(onClick = { viewModel.clearChat() }) { Icon(Icons.Default.Refresh, null) } }
            )
        },
        bottomBar = { BottomNavBar(viewModel, Screen.AiChat) }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(Modifier.weight(1f).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp),
                reverseLayout = false) {
                items(messages) { msg ->
                    val isUser = msg.role == "user"
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start) {
                        Surface(
                            color = if (isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(if (isUser) 16.dp else 4.dp, 16.dp, if (isUser) 4.dp else 16.dp, 16.dp),
                            modifier = Modifier.widthIn(max = 280.dp)
                        ) {
                            Text(msg.content, Modifier.padding(12.dp),
                                color = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
                if (isLoading) {
                    item { Row { CircularProgressIndicator(Modifier.size(24.dp)) } }
                }
            }
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = input, onValueChange = { input = it },
                    placeholder = { Text("Tanya sesuatu...") },
                    modifier = Modifier.weight(1f), shape = RoundedCornerShape(24.dp), singleLine = true
                )
                IconButton(onClick = { if (input.isNotBlank()) { viewModel.sendChatMessage(input); input = "" } },
                    enabled = !isLoading) {
                    Icon(Icons.Default.Send, null, tint = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(viewModel: MainViewModel) {
    val notifications by viewModel.notifications.collectAsStateWithLifecycle()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifikasi", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) { Icon(Icons.Default.ArrowBack, null) } },
                actions = { TextButton(onClick = { viewModel.clearNotifications() }) { Text("Hapus Semua") } }
            )
        }
    ) { padding ->
        if (notifications.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("Tidak ada notifikasi", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(notifications) { n ->
                    Card(shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Notifications, null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(Modifier.width(10.dp))
                            Text(n.pesan, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(viewModel: MainViewModel) {
    var serverUrl by remember { mutableStateOf(com.upstyle.data.SessionManager.getServerUrl()) }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pengaturan", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Koneksi Server", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = serverUrl, onValueChange = { serverUrl = it },
                        label = { Text("URL Server") },
                        placeholder = { Text("http://192.168.1.x:5173") },
                        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true
                    )
                    Text("Default: http://10.0.2.2:5173 (emulator)\nFisik: gunakan IP komputer di WiFi yang sama",
                        style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = { com.upstyle.data.SessionManager.setServerUrl(serverUrl) }, modifier = Modifier.fillMaxWidth()) {
                        Text("Simpan URL")
                    }
                }
            }
            Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Akun", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(onClick = { viewModel.logout() }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.Logout, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Logout", color = MaterialTheme.colorScheme.error)
                    }
                }
            }
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Pilih Unit Bisnis", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Button(onClick = { viewModel.navigate(Screen.Units) }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.SwapHoriz, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Ganti Unit Bisnis")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LaporanWaScreen(viewModel: MainViewModel) {
    val laporanWa by viewModel.laporanWa.collectAsStateWithLifecycle()
    var periode by remember { mutableStateOf("hari_ini") }
    val periodeList = listOf("hari_ini" to "Hari Ini", "kemarin" to "Kemarin", "minggu_ini" to "Minggu Ini", "bulan_ini" to "Bulan Ini")

    LaunchedEffect(periode) { viewModel.loadLaporanWa(periode) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Laporan WA", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                periodeList.forEach { (key, label) ->
                    FilterChip(selected = periode == key, onClick = { periode = key }, label = { Text(label, style = MaterialTheme.typography.labelSmall) })
                }
            }
            val teks = laporanWa?.teks
            if (teks != null) {
                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(Modifier.padding(16.dp)) {
                        Text(teks, style = MaterialTheme.typography.bodySmall)
                    }
                }
            } else {
                Box(Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }
    }
}
