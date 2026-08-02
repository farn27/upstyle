package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinanceScreen(viewModel: AppViewModel) {
    val financeData by viewModel.financeData.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showAddDialog by remember { mutableStateOf(false) }
    var selectedFilter by remember { mutableStateOf("Bulan Ini") }

    LaunchedEffect(Unit) {
        viewModel.loadFinanceData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Keuangan") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                actions = {
                    IconButton(onClick = { /* Filter Action */ }) {
                        Icon(Icons.Default.FilterList, contentDescription = "Filter")
                    }
                }
            )
        },
        bottomBar = {
            BottomNavBar(viewModel, Screen.Finance)
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Transaksi")
            }
        }
    ) { paddingValues ->
        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(paddingValues).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(listOf("Hari Ini", "Minggu Ini", "Bulan Ini", "Kustom")) { filter ->
                            FilterChip(
                                selected = selectedFilter == filter,
                                onClick = { selectedFilter = filter },
                                label = { Text(filter) }
                            )
                        }
                    }
                }

                item {
                    financeData?.summary?.let { summary ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)), shape = RoundedCornerShape(12.dp)) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text("Masuk", fontSize = 12.sp, color = Color(0xFF2E7D32))
                                    Text(formatCurrency(summary.totalMasuk), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF2E7D32))
                                }
                            }
                            Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)), shape = RoundedCornerShape(12.dp)) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text("Keluar", fontSize = 12.sp, color = Color(0xFFC62828))
                                    Text(formatCurrency(summary.totalKeluar), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFFC62828))
                                }
                            }
                        }
                    }
                }

                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item {
                            ActionChip("Piutang", Icons.Default.Receipt) { viewModel.navigate(Screen.Piutang) }
                        }
                        item {
                            ActionChip("Hutang", Icons.Default.MoneyOff) { viewModel.navigate(Screen.Hutang) }
                        }
                        item {
                            ActionChip("Jurnal", Icons.Default.Book) { viewModel.navigate(Screen.JurnalUmum) }
                        }
                        item {
                            ActionChip("Laporan", Icons.Default.Assessment) { viewModel.navigate(Screen.Laporan) }
                        }
                    }
                }

                item {
                    Text("Riwayat Transaksi", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }

                financeData?.transactions?.let { transactions ->
                    items(transactions, key = { it.id }) { trx ->
                        SwipeToDeleteItem(onDelete = { viewModel.deleteTransaction(trx.id) }) {
                            TransactionItem(trx)
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }

        if (showAddDialog) {
            AddTransactionSheet(
                onDismiss = { showAddDialog = false },
                onSave = { kat, nom, ket, met ->
                    viewModel.createTransaction(kat, nom, ket, met)
                    showAddDialog = false
                }
            )
        }
    }
}

@Composable
fun SwipeToDeleteItem(onDelete: () -> Unit, content: @Composable () -> Unit) {
    // simplified for brevity, assume swipe to delete implementation
    Box { content() }
}

@Composable
fun ActionChip(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    ElevatedFilterChip(
        selected = false,
        onClick = onClick,
        label = { Text(label) },
        leadingIcon = { Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp)) }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionSheet(onDismiss: () -> Unit, onSave: (String, Double, String, String) -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        var kategoriTrx by remember { mutableStateOf("MASUK") }
        var nominal by remember { mutableStateOf("") }
        var keterangan by remember { mutableStateOf("") }
        var metodeBayar by remember { mutableStateOf("KAS") }

        Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
            Text("Tambah Transaksi", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(modifier = Modifier.height(16.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = kategoriTrx == "MASUK", onClick = { kategoriTrx = "MASUK" }, label = { Text("Pemasukan") })
                FilterChip(selected = kategoriTrx == "KELUAR", onClick = { kategoriTrx = "KELUAR" }, label = { Text("Pengeluaran") })
            }
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = nominal,
                onValueChange = { nominal = it },
                label = { Text("Nominal") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = keterangan,
                onValueChange = { keterangan = it },
                label = { Text("Keterangan") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(8.dp))

            Text("Metode Bayar", fontSize = 14.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("KAS", "TRANSFER", "KREDIT").forEach { method ->
                    FilterChip(selected = metodeBayar == method, onClick = { metodeBayar = method }, label = { Text(method) })
                }
            }
            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    val nom = nominal.toDoubleOrNull() ?: 0.0
                    if (nom > 0 && keterangan.isNotBlank()) {
                        onSave(kategoriTrx, nom, keterangan, metodeBayar)
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Simpan")
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
