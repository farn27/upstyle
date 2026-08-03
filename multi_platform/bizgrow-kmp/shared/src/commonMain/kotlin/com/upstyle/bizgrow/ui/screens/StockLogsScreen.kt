package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockLogsScreen(viewModel: AppViewModel) {
    val stockLogs by viewModel.stockLogs.collectAsStateWithLifecycle()
    val products by viewModel.products.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var filterType by remember { mutableStateOf("Semua") }
    var searchQuery by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        viewModel.loadStockLogs()
    }

    val filteredLogs = stockLogs.filter { log ->
        val matchesFilter = when (filterType) {
            "Masuk" -> log.perubahan > 0
            "Keluar" -> log.perubahan < 0
            else -> true
        }
        val productName = products.firstOrNull { it.id == log.productId }?.nama ?: log.productId
        val matchesSearch = searchQuery.isBlank() ||
            productName.contains(searchQuery, ignoreCase = true) ||
            log.alasan.contains(searchQuery, ignoreCase = true)
        matchesFilter && matchesSearch
    }

    // Summary counts
    val masukCount = stockLogs.count { it.perubahan > 0 }
    val keluarCount = stockLogs.count { it.perubahan < 0 }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Riwayat Stok") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadStockLogs() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {

            // Summary banner
            Surface(color = MaterialTheme.colorScheme.surfaceVariant) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    StockSummaryChip("Total", stockLogs.size.toString(), MaterialTheme.colorScheme.onSurfaceVariant)
                    StockSummaryChip("Masuk", masukCount.toString(), Color(0xFF2E7D32))
                    StockSummaryChip("Keluar", keluarCount.toString(), Color(0xFFC62828))
                }
            }

            // Search
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Cari produk atau alasan...") },
                leadingIcon = { Icon(Icons.Default.Search, null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Default.Close, null) }
                    }
                },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(20.dp),
                singleLine = true
            )

            // Filter chips
            LazyRow(
                modifier = Modifier.padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(listOf("Semua", "Masuk", "Keluar")) { f ->
                    FilterChip(
                        selected = filterType == f,
                        onClick = { filterType = f },
                        label = { Text(f) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = when (f) {
                                "Masuk" -> Color(0xFFE8F5E9)
                                "Keluar" -> Color(0xFFFFEBEE)
                                else -> MaterialTheme.colorScheme.secondaryContainer
                            }
                        )
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            if (uiState.isLoading && stockLogs.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else if (filteredLogs.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.History, null, Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
                        Spacer(Modifier.height(8.dp))
                        Text("Belum ada riwayat stok", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredLogs, key = { it.id }) { log ->
                        val productName = products.firstOrNull { it.id == log.productId }?.nama ?: log.productId
                        EnhancedStockLogCard(log = log, productName = productName)
                    }
                    item { Spacer(Modifier.height(16.dp)) }
                }
            }
        }
    }
}

@Composable
fun StockSummaryChip(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = color)
        Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun EnhancedStockLogCard(log: StockLog, productName: String) {
    val isMasuk = log.perubahan > 0
    val color = if (isMasuk) Color(0xFF2E7D32) else Color(0xFFC62828)
    val sign = if (isMasuk) "+" else ""
    val bgColor = if (isMasuk) Color(0xFFE8F5E9) else Color(0xFFFFEBEE)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon indicator
            Box(
                modifier = Modifier.size(44.dp).clip(RoundedCornerShape(20.dp)).background(bgColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isMasuk) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(productName, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Surface(color = color.copy(alpha = 0.1f), shape = RoundedCornerShape(4.dp)) {
                        Text(log.alasan, fontSize = 10.sp, color = color, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), fontWeight = FontWeight.Medium)
                    }
                    Text(log.createdAt.take(10), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "$sign${log.perubahan}",
                    color = color,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp
                )
                Text(
                    "${log.stokAwal} → ${log.stokAkhir}",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

// Keep old StockLogCard for backward compat (used in ProdukDetailScreen)
@Composable
fun StockLogCard(log: StockLog) {
    EnhancedStockLogCard(log = log, productName = log.productId)
}
