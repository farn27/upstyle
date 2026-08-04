package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
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
import com.upstyle.bizgrow.data.PosReturn
import com.upstyle.bizgrow.data.ReturnItem
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PosReturnScreen(viewModel: AppViewModel) {
    val posReturns by viewModel.posReturns.collectAsState()
    val uiState by viewModel.uiState.collectAsState()

    var showReturnDialog by remember { mutableStateOf(false) }
    var orderIdInput by remember { mutableStateOf("") }
    var reasonInput by remember { mutableStateOf("") }
    var refundAmount by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { viewModel.loadPosReturns() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Retur Transaksi POS") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showReturnDialog = true },
                icon = { Icon(Icons.Default.Refresh, null) },
                text = { Text("Proses Retur") }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {

            // Info Banner
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD))
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Refresh, null, tint = Color(0xFF1565C0))
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("Proses Pengembalian Barang", fontWeight = FontWeight.Bold, color = Color(0xFF1565C0))
                        Text("Total retur hari ini: ${posReturns.size} transaksi", fontSize = 13.sp, color = Color(0xFF1565C0))
                    }
                }
            }

            Text("Riwayat Retur", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 16.dp))
            Spacer(Modifier.height(8.dp))

            if (posReturns.isEmpty()) {
                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    Text("Belum ada retur", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(posReturns) { ret -> ReturnItem(ret) }
                }
            }
        }

        uiState.error?.let { msg ->
            LaunchedEffect(msg) { viewModel.clearMessages() }
        }
        uiState.successMessage?.let {
            LaunchedEffect(it) { viewModel.clearMessages() }
        }
    }

    // New Return Dialog
    if (showReturnDialog) {
        AlertDialog(
            onDismissRequest = { showReturnDialog = false },
            title = { Text("Proses Retur") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = orderIdInput,
                        onValueChange = { orderIdInput = it },
                        label = { Text("Order ID / Nomor Order") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp)
                    )
                    OutlinedTextField(
                        value = refundAmount,
                        onValueChange = { refundAmount = it },
                        label = { Text("Jumlah Refund (Rp)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp)
                    )
                    OutlinedTextField(
                        value = reasonInput,
                        onValueChange = { reasonInput = it },
                        label = { Text("Alasan Retur") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        minLines = 2
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val amount = refundAmount.toDoubleOrNull() ?: 0.0
                        if (orderIdInput.isNotBlank() && amount > 0) {
                            viewModel.createReturn(
                                orderId = orderIdInput,
                                items = listOf(ReturnItem(0, "", 1, amount)),
                                reason = reasonInput
                            )
                            showReturnDialog = false
                            orderIdInput = ""
                            refundAmount = ""
                            reasonInput = ""
                        }
                    }
                ) { Text("Proses") }
            },
            dismissButton = {
                TextButton(onClick = { showReturnDialog = false }) { Text("Batal") }
            }
        )
    }
}

@Composable
fun ReturnItem(ret: PosReturn) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(ret.returnNumber, fontWeight = FontWeight.Bold)
                Text(formatCurrency(ret.totalRefund), fontWeight = FontWeight.Bold, color = Color(0xFFC62828))
            }
            Spacer(Modifier.height(4.dp))
            Text("Order: #${ret.orderId}", fontSize = 13.sp)
            ret.reason?.let { Text("Alasan: $it", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            Text(ret.createdAt, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
