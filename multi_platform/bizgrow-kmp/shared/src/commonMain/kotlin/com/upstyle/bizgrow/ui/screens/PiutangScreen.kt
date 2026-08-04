package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
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
import com.upstyle.bizgrow.data.Receivable
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PiutangScreen(viewModel: AppViewModel) {
    val receivables by viewModel.receivables.collectAsState()
    val accountingContacts by viewModel.accountingContacts.collectAsState()
    var selectedReceivable by remember { mutableStateOf<Receivable?>(null) }
    var showPaymentSheet by remember { mutableStateOf(false) }
    var showAddSheet by remember { mutableStateOf(false) }
    var paymentAmount by remember { mutableStateOf("") }
    
    // Form states
    var newContactId by remember { mutableStateOf<Int?>(null) }
    var newTanggal by remember { mutableStateOf("") }
    var newJatuhTempo by remember { mutableStateOf("") }
    var newNominal by remember { mutableStateOf("") }
    var newKeterangan by remember { mutableStateOf("") }
    var expandedContact by remember { mutableStateOf(false) }
    
    LaunchedEffect(Unit) {
        viewModel.loadReceivables()
        viewModel.loadAccountingContacts()
    }
    
    val totalOverdue = receivables.filter { it.status != "LUNAS" }.sumOf { it.nominal - it.sudahDibayar }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Piutang (AR)") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { 
                    showAddSheet = true
                    viewModel.loadAccountingContacts()
                }, 
                containerColor = MaterialTheme.colorScheme.background,
            ) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Piutang", tint = Color.White)
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
                    Text("Total Piutang Belum Dibayar", fontSize = 14.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    Text(formatCurrency(totalOverdue), fontSize = 24.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                }
            }

            var selectedFilter by remember { mutableStateOf("Semua") }
            val filterOptions = listOf("Semua", "Belum Lunas", "Lunas")

            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 16.dp)) {
                items(filterOptions) { filter ->
                    FilterChip(
                        selected = selectedFilter == filter,
                        onClick = { selectedFilter = filter },
                        label = { Text(filter) }
                    )
                }
            }
            
            val filteredReceivables = remember(receivables, selectedFilter) {
                when (selectedFilter) {
                    "Belum Lunas" -> receivables.filter { it.status != "LUNAS" }
                    "Lunas" -> receivables.filter { it.status == "LUNAS" }
                    else -> receivables
                }
            }

            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(filteredReceivables) { receivable ->
                    ReceivableItem(receivable) {
                        selectedReceivable = receivable
                        paymentAmount = (receivable.nominal - receivable.sudahDibayar).toString()
                        showPaymentSheet = true
                    }
                }
            }
        }
    }

    if (showPaymentSheet && selectedReceivable != null) {
        ModalBottomSheet(
            onDismissRequest = { showPaymentSheet = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            Column(modifier = Modifier.padding(24.dp).fillMaxWidth()) {
                Text("Bayar Piutang", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Invoice: ${selectedReceivable?.nomorInvoice}")
                Text("Sisa tagihan: ${formatCurrency(selectedReceivable!!.nominal - selectedReceivable!!.sudahDibayar)}")
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = paymentAmount,
                    onValueChange = { paymentAmount = it },
                    label = { Text("Nominal Pembayaran") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp)
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = {
                        val amount = paymentAmount.toDoubleOrNull() ?: 0.0
                        if (amount > 0) {
                            viewModel.payReceivable(selectedReceivable!!.id, amount)
                            showPaymentSheet = false
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text("Bayar", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }

    if (showAddSheet) {
        ModalBottomSheet(
            onDismissRequest = { showAddSheet = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            Column(modifier = Modifier.padding(24.dp).fillMaxWidth()) {
                Text("Tambah Piutang Baru", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                
                ExposedDropdownMenuBox(
                    expanded = expandedContact,
                    onExpandedChange = { expandedContact = !expandedContact }
                ) {
                    OutlinedTextField(
                        value = accountingContacts.find { it.id == newContactId }?.namaKontak ?: "Pilih Kontak",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Kontak") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedContact) },
                        modifier = Modifier.menuAnchor().fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = expandedContact,
                        onDismissRequest = { expandedContact = false }
                    ) {
                        accountingContacts.forEach { contact ->
                            DropdownMenuItem(
                                text = { Text(contact.namaKontak) },
                                onClick = {
                                    newContactId = contact.id
                                    expandedContact = false
                                }
                            )
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = newTanggal,
                    onValueChange = { newTanggal = it },
                    label = { Text("Tanggal (YYYY-MM-DD)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp)
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = newJatuhTempo,
                    onValueChange = { newJatuhTempo = it },
                    label = { Text("Jatuh Tempo (YYYY-MM-DD)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp)
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = newNominal,
                    onValueChange = { newNominal = it },
                    label = { Text("Nominal") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp)
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = newKeterangan,
                    onValueChange = { newKeterangan = it },
                    label = { Text("Keterangan (Opsional)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp)
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = {
                        val nominalValue = newNominal.toDoubleOrNull() ?: 0.0
                        if (newContactId != null && newTanggal.isNotEmpty() && newJatuhTempo.isNotEmpty() && nominalValue > 0) {
                            viewModel.createReceivable(newContactId!!, newTanggal, newJatuhTempo, nominalValue, newKeterangan)
                            showAddSheet = false
                            // reset
                            newContactId = null
                            newTanggal = ""
                            newJatuhTempo = ""
                            newNominal = ""
                            newKeterangan = ""
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text("Simpan", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun ReceivableItem(receivable: Receivable, onClick: () -> Unit) {
    val statusColor = when (receivable.status) {
        "LUNAS" -> Color(0xFF2E7D32)
        "SEBAGIAN" -> Color(0xFFEF6C00)
        else -> Color(0xFFC62828)
    }
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(receivable.nomorInvoice, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Surface(
                    color = statusColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(receivable.status, color = statusColor, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text("Kontak: ${receivable.contact?.namaKontak ?: "-"}", fontSize = 14.sp)
            Text("Jatuh Tempo: ${receivable.jatuhTempo}", fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Text(formatCurrency(receivable.nominal), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}
