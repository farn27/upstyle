package com.upstyle.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.data.BiMetrics
import com.upstyle.ui.MainViewModel
import com.upstyle.ui.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(viewModel: MainViewModel) {
    val activeUnit by viewModel.activeUnit.collectAsStateWithLifecycle()
    val financeData by viewModel.financeData.collectAsStateWithLifecycle()
    val notifications by viewModel.notifications.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.refreshAllData() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(activeUnit?.name ?: "Dashboard", fontWeight = FontWeight.Bold)
                        Text(activeUnit?.type ?: "", style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                actions = {
                    if (notifications.isNotEmpty()) {
                        BadgedBox(badge = { Badge { Text(notifications.size.toString()) } }) {
                            IconButton(onClick = { viewModel.navigate(Screen.Notifications) }) {
                                Icon(Icons.Default.Notifications, "Notifications")
                            }
                        }
                    } else {
                        IconButton(onClick = { viewModel.navigate(Screen.Notifications) }) {
                            Icon(Icons.Default.Notifications, "Notifications")
                        }
                    }
                    IconButton(onClick = { viewModel.navigate(Screen.Settings) }) {
                        Icon(Icons.Default.Settings, "Settings")
                    }
                }
            )
        },
        bottomBar = { BottomNavBar(viewModel, Screen.Dashboard) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // BI Metrics
            val bi = financeData?.biMetrics
            if (bi != null) {
                item { BiMetricsSection(bi) }
            } else {
                item {
                    Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
            }

            // Quick actions grid
            item { QuickActionsGrid(viewModel) }

            // Recent transactions
            item {
                Text("Transaksi Terakhir", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            val txList = financeData?.transactions?.take(5) ?: emptyList()
            if (txList.isEmpty()) {
                item {
                    Text("Belum ada transaksi", style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                items(txList.size) { i ->
                    val tx = txList[i]
                    val isMasuk = tx.kategoriTrx == "MASUK"
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                    )) {
                        Row(Modifier.fillMaxWidth().padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(color = if (isMasuk) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                                    shape = RoundedCornerShape(8.dp), modifier = Modifier.size(36.dp)) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            if (isMasuk) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                                            null, Modifier.size(20.dp),
                                            tint = if (isMasuk) Color(0xFF2E7D32) else Color(0xFFC62828)
                                        )
                                    }
                                }
                                Spacer(Modifier.width(10.dp))
                                Column {
                                    Text(tx.keterangan.take(30), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                                    Text(tx.kategoriTrx, style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Text(
                                "${if (isMasuk) "+" else "-"}Rp ${"%,.0f".format(tx.nominal)}",
                                style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold,
                                color = if (isMasuk) Color(0xFF2E7D32) else Color(0xFFC62828)
                            )
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(60.dp)) }
        }
    }
}

@Composable
fun BiMetricsSection(bi: BiMetrics) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Business Intelligence", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Surface(color = when (bi.outlook) {
                "STABLE" -> Color(0xFF2E7D32)
                "MODERATE" -> Color(0xFFEF6C00)
                else -> Color(0xFFC62828)
            }.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                Text(bi.outlook, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold,
                    color = when (bi.outlook) {
                        "STABLE" -> Color(0xFF2E7D32)
                        "MODERATE" -> Color(0xFFEF6C00)
                        else -> Color(0xFFC62828)
                    })
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            BiCard("Laba Bersih", "Rp ${"%,.0f".format(bi.netProfit)}",
                Icons.AutoMirrored.Filled.TrendingUp,
                if (bi.netProfit >= 0) Color(0xFF2E7D32) else Color(0xFFC62828), Modifier.weight(1f))
            BiCard("Margin", "${"%,.1f".format(bi.margin)}%",
                Icons.Default.Percent, Color(0xFF1565C0), Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            BiCard("Cash Runway", "${"%,.1f".format(bi.cashRunway)} Bln",
                Icons.Default.HourglassEmpty,
                when (bi.riskAssessment) { "LOW" -> Color(0xFF2E7D32); "MEDIUM" -> Color(0xFFEF6C00); else -> Color(0xFFC62828) },
                Modifier.weight(1f))
            BiCard("Health Score", "${bi.integrityScore}/10",
                Icons.Default.Favorite, Color(0xFFAD1457), Modifier.weight(1f))
        }
    }
}

@Composable
fun BiCard(title: String, value: String, icon: ImageVector, color: Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(12.dp), elevation = CardDefaults.cardElevation(2.dp)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(title, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Icon(icon, null, Modifier.size(16.dp), tint = color)
            }
            Spacer(Modifier.height(6.dp))
            Text(value, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = color)
        }
    }
}

@Composable
fun QuickActionsGrid(viewModel: MainViewModel) {
    val items = listOf(
        Triple(Icons.Default.AttachMoney, "Finance") { viewModel.navigate(Screen.Finance) },
        Triple(Icons.Default.Inventory, "Produk") { viewModel.navigate(Screen.Products) },
        Triple(Icons.Default.PointOfSale, "Kasir") { viewModel.navigate(Screen.Pos) },
        Triple(Icons.Default.People, "HR") { viewModel.navigate(Screen.Hr) },
        Triple(Icons.Default.Handshake, "CRM") { viewModel.navigate(Screen.Crm) },
        Triple(Icons.Default.LocalShipping, "SCM") { viewModel.navigate(Screen.Scm) },
        Triple(Icons.Default.SmartToy, "AI Chat") { viewModel.navigate(Screen.AiChat) },
        Triple(Icons.Default.Analytics, "Laporan WA") { viewModel.navigate(Screen.LaporanWa) },
    )
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Menu Utama", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        val chunked = items.chunked(4)
        chunked.forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { (icon, label, action) ->
                    Card(onClick = action, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp)) {
                        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(icon, null, Modifier.size(24.dp), tint = MaterialTheme.colorScheme.primary)
                            Spacer(Modifier.height(4.dp))
                            Text(label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                        }
                    }
                }
                repeat(4 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
fun BottomNavBar(viewModel: MainViewModel, currentScreen: Screen) {
    NavigationBar {
        NavigationBarItem(
            selected = currentScreen is Screen.Dashboard,
            onClick = { viewModel.navigate(Screen.Dashboard) },
            icon = { Icon(Icons.Default.Home, null) },
            label = { Text("Beranda") }
        )
        NavigationBarItem(
            selected = currentScreen is Screen.Pos,
            onClick = { viewModel.navigate(Screen.Pos) },
            icon = { Icon(Icons.Default.PointOfSale, null) },
            label = { Text("Kasir") }
        )
        NavigationBarItem(
            selected = currentScreen is Screen.Finance,
            onClick = { viewModel.navigate(Screen.Finance) },
            icon = { Icon(Icons.Default.AttachMoney, null) },
            label = { Text("Keuangan") }
        )
        NavigationBarItem(
            selected = currentScreen is Screen.AiChat,
            onClick = { viewModel.navigate(Screen.AiChat) },
            icon = { Icon(Icons.Default.SmartToy, null) },
            label = { Text("AI") }
        )
    }
}
