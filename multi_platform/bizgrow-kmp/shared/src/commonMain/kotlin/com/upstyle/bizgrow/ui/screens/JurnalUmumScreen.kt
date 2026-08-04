package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.CreateJournalLineBody
import com.upstyle.bizgrow.data.JournalEntry
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JurnalUmumScreen(viewModel: AppViewModel) {
    val journalEntries by viewModel.journalEntries.collectAsState()
    var showAddJurnal by remember { mutableStateOf(false) }
    
    LaunchedEffect(Unit) {
        viewModel.loadJournalEntries()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Jurnal Umum") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddJurnal = true }, containerColor = MaterialTheme.colorScheme.background,) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Jurnal", tint = Color.White)
            }
        }
    ) { paddingValues ->
        Column(modifier = Modifier.padding(paddingValues).fillMaxSize().padding(16.dp)) {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Total Entri Jurnal", fontSize = 14.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    Text("${journalEntries.size} Transaksi", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                }
            }

            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(journalEntries) { entry ->
                    JournalEntryItem(entry)
                }
            }
        }

        if (showAddJurnal) {
            AddJurnalSheet(
                viewModel = viewModel,
                onDismiss = { showAddJurnal = false },
                onSave = { tanggal, memo, lines ->
                    viewModel.createJournalEntry(tanggal, memo, lines)
                    showAddJurnal = false
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddJurnalSheet(
    viewModel: AppViewModel,
    onDismiss: () -> Unit,
    onSave: (tanggal: String, memo: String?, lines: List<CreateJournalLineBody>) -> Unit
) {
    val chartOfAccounts by viewModel.chartOfAccounts.collectAsState()
    var tanggal by remember { mutableStateOf("") }
    var memo by remember { mutableStateOf("") }

    // Each line: coaId, keterangan, debit, kredit
    val lines = remember { mutableStateListOf<MutableMap<String, String>>() }

    // Ensure at least 2 lines exist (debit + kredit)
    LaunchedEffect(Unit) {
        viewModel.loadChartOfAccounts()
        lines.add(mutableMapOf("coaId" to "", "keterangan" to "", "debit" to "", "kredit" to ""))
        lines.add(mutableMapOf("coaId" to "", "keterangan" to "", "debit" to "", "kredit" to ""))
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 8.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text("Tambah Jurnal Umum", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(16.dp))

            OutlinedTextField(
                value = tanggal,
                onValueChange = { tanggal = it },
                label = { Text("Tanggal (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp)
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = memo,
                onValueChange = { memo = it },
                label = { Text("Memo / Keterangan") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp)
            )

            Spacer(Modifier.height(16.dp))
            Text("Baris Jurnal:", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))

            lines.forEachIndexed { index, lineMap ->
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Baris ${index + 1}", fontWeight = FontWeight.Medium)
                            if (lines.size > 2) {
                                IconButton(onClick = { lines.removeAt(index) }) {
                                    Icon(Icons.Default.Delete, null, tint = Color(0xFFC62828))
                                }
                            }
                        }
                        // COA dropdown for this line
                        var expandedCoa by remember { mutableStateOf(false) }
                        val selectedCoaId = lineMap["coaId"]?.toIntOrNull()
                        val selectedCoaName = chartOfAccounts.firstOrNull { it.id == selectedCoaId }?.let { "${it.kodeAkun} - ${it.namaAkun}" } ?: "Pilih Akun"
                        ExposedDropdownMenuBox(expanded = expandedCoa, onExpandedChange = { expandedCoa = !expandedCoa }) {
                            OutlinedTextField(
                                value = selectedCoaName,
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Akun") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedCoa) },
                                modifier = Modifier.menuAnchor().fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            )
                            ExposedDropdownMenu(expanded = expandedCoa, onDismissRequest = { expandedCoa = false }) {
                                chartOfAccounts.forEach { coa ->
                                    DropdownMenuItem(
                                        text = { Text("${coa.kodeAkun} - ${coa.namaAkun}", fontSize = 13.sp) },
                                        onClick = { lineMap["coaId"] = coa.id.toString(); expandedCoa = false }
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = lineMap["debit"] ?: "",
                                onValueChange = { lineMap["debit"] = it },
                                label = { Text("Debit") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp)
                            )
                            OutlinedTextField(
                                value = lineMap["kredit"] ?: "",
                                onValueChange = { lineMap["kredit"] = it },
                                label = { Text("Kredit") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp)
                            )
                        }
                    }
                }
            }

            TextButton(
                onClick = {
                    lines.add(mutableMapOf("coaId" to "", "keterangan" to "", "debit" to "", "kredit" to ""))
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Add, null)
                Spacer(Modifier.width(4.dp))
                Text("Tambah Baris")
            }

            Spacer(Modifier.height(16.dp))
            Button(
                onClick = {
                    val journalLines = lines.mapNotNull { lineMap ->
                        val coaId = lineMap["coaId"]?.toIntOrNull() ?: return@mapNotNull null
                        CreateJournalLineBody(
                            coaId = coaId,
                            keterangan = lineMap["keterangan"]?.ifBlank { null },
                            debit = lineMap["debit"]?.toDoubleOrNull() ?: 0.0,
                            kredit = lineMap["kredit"]?.toDoubleOrNull() ?: 0.0
                        )
                    }
                    if (tanggal.isNotBlank() && journalLines.isNotEmpty()) {
                        onSave(tanggal, memo.ifBlank { null }, journalLines)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(20.dp)
            ) {
                Text("Simpan Jurnal", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
fun JournalEntryItem(entry: JournalEntry) {
    var expanded by remember { mutableStateOf(false) }
    val statusColor = if (entry.status == "POSTED") Color(0xFF2E7D32) else Color.Gray

    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).clickable { expanded = !expanded },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(entry.nomorJurnal, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Surface(
                    color = statusColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(entry.status, color = statusColor, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(entry.tanggal, fontSize = 14.sp)
            Text(entry.memo ?: "-", fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Text("Total Debit: ${formatCurrency(entry.totalDebit)}", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            
            if (expanded) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))
                entry.lines.forEach { line ->
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(line.account?.namaAkun ?: "-", fontSize = 14.sp, modifier = Modifier.weight(1f))
                        val isDebit = line.debit > 0
                        val amount = if (isDebit) line.debit else line.kredit
                        Text(
                            if (isDebit) "Db ${formatCurrency(amount)}" else "Kr ${formatCurrency(amount)}",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (isDebit) MaterialTheme.colorScheme.primary else Color(0xFFC62828)
                        )
                    }
                }
            }
        }
    }
}
