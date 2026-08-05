package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.BusinessUnit
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UnitsScreen(viewModel: AppViewModel) {
    val units by viewModel.units.collectAsState(initial = viewModel.units.value)

    var showDialog by remember { mutableStateOf(false) }
    var nameInput by remember { mutableStateOf("") }
    var typeInput by remember { mutableStateOf("RETAIL") }

    LaunchedEffect(Unit) { viewModel.loadUnits() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Unit Bisnis", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { /* logout placeholder */ }) {
                        Icon(Icons.Default.Logout, contentDescription = "Keluar")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showDialog = true }) { Icon(Icons.Default.Add, null) }
        }
    ) { padding ->
        if (units.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Storefront, null, Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.4f))
                    Text("Belum ada unit bisnis", style = MaterialTheme.typography.titleMedium)
                    Text("Tekan + untuk membuat bisnis baru", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(units) { unit ->
                    Card(onClick = { viewModel.selectUnit(unit.id) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(20.dp), modifier = Modifier.size(48.dp)) {
                                    Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Storefront, null, tint = MaterialTheme.colorScheme.primary) }
                                }
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(unit.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Text(unit.type, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("Buat Unit Bisnis", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(value = nameInput, onValueChange = { nameInput = it }, label = { Text("Nama Bisnis") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("RETAIL", "FNB", "JASA", "LAINNYA").forEach { t ->
                            FilterChip(selected = typeInput == t, onClick = { typeInput = t }, label = { Text(t, style = MaterialTheme.typography.labelSmall) })
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (nameInput.isNotBlank()) {
                        /* createUnit API not implemented yet */
                        showDialog = false
                        nameInput = ""
                    }
                }) { Text("Buat") }
            },
            dismissButton = { TextButton(onClick = { showDialog = false }) { Text("Batal") } }
        )
    }
}
