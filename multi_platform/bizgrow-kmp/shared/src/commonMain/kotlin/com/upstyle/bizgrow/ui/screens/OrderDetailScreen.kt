package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.data.*
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(viewModel: AppViewModel, orderId: Int) {
    val selectedOrder by viewModel.selectedOrder.collectAsStateWithLifecycle()

    LaunchedEffect(orderId) {
        viewModel.loadOrderDetail(orderId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detail Pesanan") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { padding ->
        selectedOrder?.let { order ->
            LazyColumn(modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp)) {
                item {
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Informasi Pelanggan", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            Spacer(Modifier.height(8.dp))
                            Text("Nama: ${order.customerName}")
                            Text("Telepon: ${order.customerPhone.ifEmpty { "-" }}")
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Text("Item Pesanan", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                }

                val itemsList = order.items
                items(itemsList) { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.productName, fontWeight = FontWeight.Medium)
                            Text("${item.qty} x Rp ${"%,.0f".format(item.price)}", style = MaterialTheme.typography.bodySmall)
                        }
                        Text("Rp ${"%,.0f".format(item.subtotal)}", fontWeight = FontWeight.Bold)
                    }
                    Divider()
                }

                item {
                    Spacer(Modifier.height(16.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Subtotal", fontWeight = FontWeight.Medium)
                        Text("Rp ${"%,.0f".format(order.items.sumOf { it.subtotal })}")
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Total", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                        Text("Rp ${"%,.0f".format(order.totalAmount)}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge, color = Color(0xFF2E7D32))
                    }

                    Spacer(Modifier.height(24.dp))
                    Text("Status Pesanan", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    Text("Update Status:", fontWeight = FontWeight.Medium, style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(8.dp))
                    val statusOptions = listOf("PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED")
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.horizontalScroll(rememberScrollState())
                    ) {
                        statusOptions.forEach { statusOpt ->
                            FilterChip(
                                selected = order.status == statusOpt,
                                onClick = { viewModel.updateOrderStatus(orderId, statusOpt) },
                                label = { Text(statusOpt, fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = when(statusOpt) {
                                        "DELIVERED" -> Color(0xFF2E7D32)
                                        "CANCELLED" -> Color(0xFFC62828)
                                        "SHIPPED" -> Color(0xFF1565C0)
                                        else -> MaterialTheme.colorScheme.primary
                                    },
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }
            }
        } ?: run {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
    }
}
