package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.ChartOfAccount
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BukuBesarScreen(viewModel: AppViewModel) {
    val chartOfAccounts by viewModel.chartOfAccounts.collectAsState()
    val bukuBesarData by viewModel.bukuBesarData.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    
    var selectedCoa by remember { mutableStateOf<ChartOfAccount?>(null) }
    var expanded by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadChartOfAccounts()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Buku Besar") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(modifier = Modifier.padding(paddingValues).fillMaxSize().padding(16.dp)) {
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = !expanded }
            ) {
                OutlinedTextField(
                    value = selectedCoa?.namaAkun ?: "Pilih Akun (COA)",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Akun Perkiraan") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp)
                )
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    chartOfAccounts.forEach { coa ->
                        DropdownMenuItem(
                            text = { Text("${coa.kodeAkun} - ${coa.namaAkun}") },
                            onClick = {
                                selectedCoa = coa
                                expanded = false
                                viewModel.loadBukuBesar(coa.id)
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (selectedCoa != null) {
                if (uiState.isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else if (bukuBesarData != null) {
                    val data = bukuBesarData!!
                    
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        modifier = Modifier.fillMaxWidth().weight(1f)
                    ) {
                        LazyColumn(modifier = Modifier.fillMaxSize().padding(8.dp)) {
                            item {
                                Row(modifier = Modifier.fillMaxWidth().padding(8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Tanggal", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1.5f))
                                    Text("Keterangan", fontWeight = FontWeight.Bold, modifier = Modifier.weight(2f))
                                    Text("Debit", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                    Text("Kredit", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                    Text("Saldo", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                }
                                HorizontalDivider()
                            }
                            items(data.entries) { row ->
                                Row(modifier = Modifier.fillMaxWidth().padding(8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(row.tanggal, fontSize = 12.sp, modifier = Modifier.weight(1.5f))
                                    Text(row.keterangan ?: "-", fontSize = 12.sp, modifier = Modifier.weight(2f))
                                    Text(if (row.debit > 0) "Rp ${"%,.0f".format(row.debit)}" else "-", fontSize = 12.sp, modifier = Modifier.weight(1f))
                                    Text(if (row.kredit > 0) "Rp ${"%,.0f".format(row.kredit)}" else "-", fontSize = 12.sp, modifier = Modifier.weight(1f))
                                    Text("Rp ${"%,.0f".format(row.saldo)}", fontSize = 12.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                                }
                                HorizontalDivider(color = Color.LightGray.copy(alpha = 0.5f))
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Saldo Akhir - ${selectedCoa?.namaAkun ?: ""}", fontSize = 14.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            Text("Rp ${"%,.0f".format(data.saldoAkhir)}", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                        }
                    }
                } else {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Belum ada data atau pilih akun lain", color = Color.Gray)
                    }
                }
            } else {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Pilih akun untuk melihat Buku Besar", color = Color.Gray)
                }
            }
        }
    }
}
