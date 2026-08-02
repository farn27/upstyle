package com.upstyle.ui.screens

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.data.TransactionBody
import com.upstyle.ui.MainViewModel
import com.upstyle.ui.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinanceScreen(viewModel: MainViewModel) {
    val financeData by viewModel.financeData.collectAsStateWithLifecycle()
    var showAddDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadFinanceData() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Keuangan", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) {
                        Icon(Icons.Default.ArrowBack, null)
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, null)
            }
        },
        bottomBar = { BottomNavBar(viewModel, Screen.Finance) }
    ) { padding ->
        val bi = financeData?.biMetrics
        val txList = financeData?.transactions ?: emptyList()
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (bi != null) {
                item {
                    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("Ringkasan Keuangan", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Pemasukan", style = MaterialTheme.typography.bodySmall)
                                Text("Rp ${"%,.0f".format(bi.totalMasuk)}", style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                            }
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Pengeluaran", style = MaterialTheme.typography.bodySmall)
                                Text("Rp ${"%,.0f".format(bi.totalKeluar)}", style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold, color = Color(0xFFC62828))
                            }
                            HorizontalDivider()
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Laba/Rugi", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                Text("Rp ${"%,.0f".format(bi.netProfit)}", style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold, color = if (bi.netProfit >= 0) Color(0xFF2E7D32) else Color(0xFFC62828))
                            }
                        }
                    }
                }
            }
            item { Text("Riwayat Transaksi (${txList.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
            items(txList) { tx ->
                val isMasuk = tx.kategoriTrx == "MASUK"
                Card(shape = RoundedCornerShape(12.dp)) {
                    Row(Modifier.fillMaxWidth().padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(color = if (isMasuk) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                                shape = RoundedCornerShape(8.dp), modifier = Modifier.size(36.dp)) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(if (isMasuk) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward, null,
                                        Modifier.size(18.dp), tint = if (isMasuk) Color(0xFF2E7D32) else Color(0xFFC62828))
                                }
                            }
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text(tx.keterangan.take(35), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                                Text(tx.kategoriTrx, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("${if (isMasuk) "+" else "-"}Rp ${"%,.0f".format(tx.nominal)}",
                                style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold,
                                color = if (isMasuk) Color(0xFF2E7D32) else Color(0xFFC62828))
                            IconButton(onClick = { viewModel.deleteTransaction(tx.id) }, modifier = Modifier.size(20.dp)) {
                                Icon(Icons.Default.Delete, null, Modifier.size(14.dp), tint = Color.Gray)
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }

    if (showAddDialog) {
        AddTransactionDialog(
            onDismiss = { showAddDialog = false },
            onConfirm = { type, amount, desc ->
                viewModel.addTransaction(type, amount, desc)
                showAddDialog = false
            }
        )
    }
}

@Composable
fun AddTransactionDialog(onDismiss: () -> Unit, onConfirm: (String, Double, String) -> Unit) {
    var type by remember { mutableStateOf("MASUK") }
    var amount by remember { mutableStateOf("") }
    var desc by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Tambah Transaksi", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = type == "MASUK", onClick = { type = "MASUK" }, label = { Text("Masuk") })
                    FilterChip(selected = type == "KELUAR", onClick = { type = "KELUAR" }, label = { Text("Keluar") })
                }
                OutlinedTextField(value = amount, onValueChange = { amount = it }, label = { Text("Nominal (Rp)") },
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true)
                OutlinedTextField(value = desc, onValueChange = { desc = it }, label = { Text("Keterangan") },
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true)
            }
        },
        confirmButton = {
            Button(onClick = {
                val amt = amount.replace(",", "").replace(".", "").toDoubleOrNull() ?: return@Button
                onConfirm(type, amt, desc)
            }) { Text("Simpan") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Batal") } }
    )
}
