package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import com.upstyle.bizgrow.ui.components.InfoRow
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
fun OrderDetailScreen(viewModel: AppViewModel, orderId: Int) {
    val selectedOrder by viewModel.selectedOrder.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(orderId) {
        viewModel.loadOrderDetail(orderId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Detail Pesanan", fontWeight = FontWeight.Bold)
                        selectedOrder?.let { Text("#${it.orderNumber}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading && selectedOrder == null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        selectedOrder?.let { order ->
            LazyColumn(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Status + source
                item {
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Status Pesanan", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                val statusColor = when (order.status) {
                                    "DELIVERED", "Completed" -> Color(0xFF2E7D32)
                                    "CANCELLED", "Cancelled" -> Color(0xFFC62828)
                                    "SHIPPED" -> Color(0xFF1565C0)
                                    else -> Color(0xFFEF6C00)
                                }
                                Surface(color = statusColor.copy(alpha = 0.15f), shape = RoundedCornerShape(12.dp)) {
                                    Text(
                                        order.status,
                                        color = statusColor,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                    )
                                }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("Sumber", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Badge { Text(order.source) }
                            }
                        }
                    }
                }

                // Customer info
                item {
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Person, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                                }
                                Spacer(Modifier.width(12.dp))
                                Text("Informasi Pelanggan", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                            HorizontalDivider()
                            InfoRow("Nama", order.customerName)
                            InfoRow("Telepon", order.customerPhone.ifEmpty { "-" })
                            InfoRow("Tanggal", order.createdAt.take(10))
                        }
                    }
                }

                // Order items
                item {
                    Text("Item Pesanan (${order.items.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }

                items(order.items) { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.productName, fontWeight = FontWeight.Medium)
                                Text("${item.qty} × Rp ${"%,.0f".format(item.price)}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text("Rp ${"%,.0f".format(item.subtotal)}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }

                // Summary
                item {
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Ringkasan Pembayaran", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            HorizontalDivider()
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Subtotal", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("Rp ${"%,.0f".format(order.items.sumOf { it.subtotal })}")
                            }
                            if (order.totalAmount != order.items.sumOf { it.subtotal }) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Diskon / Ongkir", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("Rp ${"%,.0f".format(order.totalAmount - order.items.sumOf { it.subtotal })}")
                                }
                            }
                            HorizontalDivider()
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text("Rp ${"%,.0f".format(order.totalAmount)}", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Color(0xFF2E7D32))
                            }
                        }
                    }
                }

                // Update status
                item {
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Perbarui Status", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Spacer(Modifier.height(12.dp))
                            val statusOptions = listOf("PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED")
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.horizontalScroll(rememberScrollState())
                            ) {
                                statusOptions.forEach { statusOpt ->
                                    val statusColor = when (statusOpt) {
                                        "DELIVERED" -> Color(0xFF2E7D32)
                                        "CANCELLED" -> Color(0xFFC62828)
                                        "SHIPPED" -> Color(0xFF1565C0)
                                        "PAID" -> Color(0xFF1976D2)
                                        else -> MaterialTheme.colorScheme.primary
                                    }
                                    FilterChip(
                                        selected = order.status == statusOpt,
                                        onClick = { viewModel.updateOrderStatus(orderId, statusOpt) },
                                        label = { Text(statusOpt, fontSize = 11.sp) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = statusColor,
                                            selectedLabelColor = Color.White
                                        )
                                    )
                                }
                            }
                        }
                    }
                }

                item { Spacer(Modifier.height(24.dp)) }
            }
        } ?: run {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
    }
}
