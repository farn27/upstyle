package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.data.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockLogsScreen(viewModel: AppViewModel) {
    val stockLogs by viewModel.stockLogs.collectAsStateWithLifecycle()
    
    var filterType by remember { mutableStateOf("All") } // All, Masuk, Keluar
    
    LaunchedEffect(Unit) {
        viewModel.loadStockLogs()
    }
    
    val filteredLogs = stockLogs.filter { log ->
        when (filterType) {
            "Masuk" -> log.perubahan > 0
            "Keluar" -> log.perubahan < 0
            else -> true
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Riwayat Stok") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = filterType == "All",
                    onClick = { filterType = "All" },
                    label = { Text("Semua") }
                )
                FilterChip(
                    selected = filterType == "Masuk",
                    onClick = { filterType = "Masuk" },
                    label = { Text("Masuk (+)") }
                )
                FilterChip(
                    selected = filterType == "Keluar",
                    onClick = { filterType = "Keluar" },
                    label = { Text("Keluar (-)") }
                )
            }
            
            if (filteredLogs.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Belum ada riwayat stok.", style = MaterialTheme.typography.bodyLarge)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredLogs) { log ->
                        StockLogCard(log = log)
                    }
                }
            }
        }
    }
}

@Composable
fun StockLogCard(log: StockLog) {
    val isMasuk = log.perubahan > 0
    val color = if (isMasuk) Color(0xFF2E7D32) else Color(0xFFC62828)
    val sign = if (isMasuk) "+" else ""

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = log.productId, // Adjust if you have a product name property
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = "$sign${log.perubahan}",
                    color = color,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = "Tanggal: ${log.createdAt}", style = MaterialTheme.typography.bodySmall)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Awal: ${log.stokAwal}", style = MaterialTheme.typography.bodyMedium)
                Text("Akhir: ${log.stokAkhir}", style = MaterialTheme.typography.bodyMedium)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = "Alasan: ${log.alasan}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
