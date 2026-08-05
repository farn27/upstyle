package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.Transaction
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinanceScreen(viewModel: AppViewModel) {
    val financeData by viewModel.financeData.collectAsState(initial = viewModel.financeData.value)
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    var showAddDialog by remember { mutableStateOf(false) }
    var selectedFilter by remember { mutableStateOf("Semua") }
    var searchQuery by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { viewModel.loadFinanceData() }

    val transactions = financeData?.transactions ?: emptyList()
    val filtered = transactions.filter { trx ->
        val matchSearch = searchQuery.isBlank() || trx.keterangan.contains(searchQuery, ignoreCase = true)
        val matchFilter = when (selectedFilter) {
            "Masuk" -> trx.kategoriTrx.equals("PEMASUKAN", ignoreCase = true) || trx.kategoriTrx.equals("MASUK", ignoreCase = true)
            "Keluar" -> trx.kategoriTrx.equals("PENGELUARAN", ignoreCase = true) || trx.kategoriTrx.equals("KELUAR", ignoreCase = true)
            else -> true
        }
        matchSearch && matchFilter
    }
    val totalMasuk = transactions.filter { it.kategoriTrx.equals("PEMASUKAN", ignoreCase = true) || it.kategoriTrx.equals("MASUK", ignoreCase = true) }.sumOf { it.nominal }
    val totalKeluar = transactions.filter { it.kategoriTrx.equals("PENGELUARAN", ignoreCase = true) || it.kategoriTrx.equals("KELUAR", ignoreCase = true) }.sumOf { it.nominal }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Keuangan", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } },
                actions = {
                    IconButton(onClick = { viewModel.navigate(Screen.Laporan) }) { Icon(Icons.Default.Assessment, null) }
                }
            )
        },
        bottomBar = { BottomNavBar(viewModel, Screen.Finance) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }, containerColor = BizgrowColors.Primary, shape = RoundedCornerShape(20.dp)) {
                Icon(Icons.Default.Add, null, tint = BizgrowColors.White)
            }
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Summary hero
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    SummaryCard("Pemasukan", totalMasuk, Color(0xFF22C55E), Icons.Default.ArrowDownward, Modifier.weight(1f))
                    SummaryCard("Pengeluaran", totalKeluar, Color(0xFFEF4444), Icons.Default.ArrowUpward, Modifier.weight(1f))
                }
            }

            // Balance card
            item {
                val balance = totalMasuk - totalKeluar
                val isPos = balance >= 0
                Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = if (isPos) Color(0xFFECFDF5) else Color(0xFFFEF2F2))) {
                    Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column {
                            Text("Saldo Bersih", fontSize = 12.sp, color = if (isPos) Color(0xFF059669) else Color(0xFFDC2626))
                            Text(formatCurrency(balance), fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = if (isPos) Color(0xFF065F46) else Color(0xFFB91C1C))
                        }
                        Icon(if (isPos) Icons.Default.TrendingUp else Icons.Default.TrendingDown, null, Modifier.size(32.dp), tint = if (isPos) Color(0xFF22C55E) else Color(0xFFEF4444))
                    }
                }
            }

            // Module shortcuts
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text("Modul Keuangan", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = BizgrowColors.Gray950)
                    Spacer(Modifier.height(10.dp))
                    // Row 1: Core modules
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ModuleChip("Piutang", Icons.Default.Receipt) { viewModel.navigate(Screen.Piutang) }
                        ModuleChip("Hutang", Icons.Default.MoneyOff) { viewModel.navigate(Screen.Hutang) }
                        ModuleChip("Jurnal", Icons.Default.Book) { viewModel.navigate(Screen.JurnalUmum) }
                        ModuleChip("Buku Besar", Icons.Default.MenuBook) { viewModel.navigate(Screen.BukuBesar) }
                    }
                    Spacer(Modifier.height(8.dp))
                    // Row 2: Advanced modules
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item { ModuleChip("COA", Icons.Default.ListAlt) { viewModel.navigate(Screen.Coa) } }
                        item { ModuleChip("Aset Tetap", Icons.Default.Business) { viewModel.navigate(Screen.FixedAssets) } }
                        item { ModuleChip("Pajak", Icons.Default.Receipt) { viewModel.navigate(Screen.TaxRates) } }
                        item { ModuleChip("Budget", Icons.Default.PieChart) { viewModel.navigate(Screen.Budget) } }
                        item { ModuleChip("Tutup Buku", Icons.Default.Lock) { viewModel.navigate(Screen.ClosingPeriod) } }
                        item { ModuleChip("Laporan", Icons.Default.Assessment) { viewModel.navigate(Screen.Laporan) } }
                        item { ModuleChip("Neraca", Icons.Default.Balance) { viewModel.navigate(Screen.Neraca) } }
                    }
                }
            }

            // Search + filter
            item {
                OutlinedTextField(value = searchQuery, onValueChange = { searchQuery = it },
                    placeholder = { Text("Cari transaksi...") },
                    leadingIcon = { Icon(Icons.Default.Search, null) },
                    trailingIcon = { if (searchQuery.isNotEmpty()) IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Default.Close, null) } },
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true)
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Semua", "Masuk", "Keluar").forEach { f ->
                        FilterChip(selected = selectedFilter == f, onClick = { selectedFilter = f }, label = { Text(f) })
                    }
                }
            }

            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Riwayat Transaksi (${filtered.size})", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                }
            }

            if (filtered.isEmpty()) {
                item {
                    Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text("Tidak ada transaksi", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            } else {
                items(filtered, key = { it.id }) { trx ->
                    TransactionCard(trx, onDelete = { viewModel.deleteTransaction(trx.id) })
                }
            }

            item { Spacer(Modifier.height(80.dp)) }
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
fun SummaryCard(label: String, amount: Double, color: Color, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f)), elevation = CardDefaults.cardElevation(0.dp)) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(Modifier.size(28.dp).clip(CircleShape).background(color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                    Icon(icon, null, Modifier.size(15.dp), tint = color)
                }
                Text(label, fontSize = 12.sp, color = color, fontWeight = FontWeight.Medium)
            }
            Text(formatCurrency(amount), fontWeight = FontWeight.Bold, fontSize = 15.sp, color = color)
        }
    }
}

@Composable
fun ModuleChip(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    ElevatedFilterChip(selected = false, onClick = onClick, label = { Text(label, fontSize = 12.sp) },
        leadingIcon = { Icon(icon, null, Modifier.size(15.dp)) }, shape = RoundedCornerShape(10.dp))
}

@Composable
fun TransactionCard(trx: Transaction, onDelete: () -> Unit) {
    var showDeleteConfirm by remember { mutableStateOf(false) }
    val isMasuk = trx.kategoriTrx.equals("PEMASUKAN", ignoreCase = true) || trx.kategoriTrx.equals("MASUK", ignoreCase = true)
    val color = if (isMasuk) Color(0xFF22C55E) else Color(0xFFEF4444)

    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), elevation = CardDefaults.cardElevation(1.dp)) {
        Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).clip(RoundedCornerShape(20.dp)).background(color.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                Icon(if (isMasuk) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward, null, Modifier.size(18.dp), tint = color)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(trx.keterangan, fontWeight = FontWeight.Medium, fontSize = 14.sp, maxLines = 1)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(trx.tanggal.take(10), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("·", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(trx.metodeBayar, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("${if (isMasuk) "+" else "-"}${formatCurrency(trx.nominal)}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = color)
                IconButton(onClick = { showDeleteConfirm = true }, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Default.DeleteOutline, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Hapus Transaksi?") },
            text = { Text("\"${trx.keterangan}\" akan dihapus permanen.") },
            confirmButton = {
                Button(onClick = { onDelete(); showDeleteConfirm = false }, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))) { Text("Hapus") }
            },
            dismissButton = { TextButton(onClick = { showDeleteConfirm = false }) { Text("Batal") } }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionSheet(onDismiss: () -> Unit, onSave: (String, Double, String, String) -> Unit) {
    var kategoriTrx by remember { mutableStateOf("MASUK") }
    var nominal by remember { mutableStateOf("") }
    var keterangan by remember { mutableStateOf("") }
    var metodeBayar by remember { mutableStateOf("KAS") }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Tambah Transaksi", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                TextButton(onClick = onDismiss) { Text("Batal") }
            }

            // Type toggle
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("MASUK" to Color(0xFF22C55E), "KELUAR" to Color(0xFFEF4444)).forEach { (k, c) ->
                    Card(
                        modifier = Modifier.weight(1f).height(48.dp).clickable { kategoriTrx = k },
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = if (kategoriTrx == k) c.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant),
                        border = if (kategoriTrx == k) CardDefaults.outlinedCardBorder() else null
                    ) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(if (k == "MASUK") "Pemasukan" else "Pengeluaran", fontWeight = if (kategoriTrx == k) FontWeight.Bold else FontWeight.Normal, color = if (kategoriTrx == k) c else MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }

            OutlinedTextField(value = nominal, onValueChange = { nominal = it }, label = { Text("Nominal (Rp)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true)
            OutlinedTextField(value = keterangan, onValueChange = { keterangan = it }, label = { Text("Keterangan") },
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true)

            Text("Metode Bayar:", fontWeight = FontWeight.Medium, fontSize = 14.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("KAS", "TRANSFER", "QRIS", "KREDIT").forEach { m ->
                    FilterChip(selected = metodeBayar == m, onClick = { metodeBayar = m }, label = { Text(m, fontSize = 12.sp) })
                }
            }

            Button(
                onClick = {
                    val nom = nominal.toDoubleOrNull() ?: 0.0
                    if (nom > 0 && keterangan.isNotBlank()) { onSave(kategoriTrx, nom, keterangan, metodeBayar) }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(20.dp),
                enabled = nominal.isNotBlank() && keterangan.isNotBlank()
            ) { Text("Simpan Transaksi", fontSize = 16.sp, fontWeight = FontWeight.Bold) }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
fun SwipeToDeleteItem(onDelete: () -> Unit, content: @Composable () -> Unit) {
    Box { content() }
}

@Composable
fun ActionChip(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    ModuleChip(label, icon, onClick)
}
