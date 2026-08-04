package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.data.*
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(viewModel: AppViewModel) {
    val orders by viewModel.orders.collectAsState()
    var selectedFilter by remember { mutableStateOf("All") }
    val filters = listOf("All", "Pending", "Processing", "Shipped", "Completed", "Cancelled")

    LaunchedEffect(Unit) {
        viewModel.loadOrders()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pesanan") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            Surface(color = MaterialTheme.colorScheme.surfaceVariant) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Total: ${orders.size} Pesanan", fontWeight = FontWeight.Bold)
                    val todayRev = orders.filter { it.status != "Cancelled" }.sumOf { it.totalAmount }
                    Text("Pendapatan: Rp ${"%,.0f".format(todayRev)}", fontWeight = FontWeight.Bold)
                }
            }

            LazyRow(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filters) { filter ->
                    FilterChip(
                        selected = selectedFilter == filter,
                        onClick = { selectedFilter = filter },
                        label = { Text(filter) }
                    )
                }
            }

            val filteredOrders = orders.filter { selectedFilter == "All" || it.status == selectedFilter }

            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filteredOrders) { order ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { viewModel.navigate(Screen.OrderDetail(order.id)) },
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("#${order.orderNumber}", fontWeight = FontWeight.Bold)
                                Badge { Text(order.source) }
                            }
                            Spacer(Modifier.height(8.dp))
                            Text(order.customerName, style = MaterialTheme.typography.bodyLarge)
                            Text("Rp ${"%,.0f".format(order.totalAmount)}", color = Color(0xFF2E7D32), fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(8.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(order.createdAt, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                val statusColor = when(order.status) {
                                    "Completed" -> Color(0xFF2E7D32)
                                    "Cancelled" -> Color(0xFFC62828)
                                    else -> Color(0xFFEF6C00)
                                }
                                SuggestionChip(
                                    onClick = {},
                                    label = { Text(order.status) },
                                    colors = SuggestionChipDefaults.suggestionChipColors(containerColor = statusColor.copy(alpha = 0.1f))
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
