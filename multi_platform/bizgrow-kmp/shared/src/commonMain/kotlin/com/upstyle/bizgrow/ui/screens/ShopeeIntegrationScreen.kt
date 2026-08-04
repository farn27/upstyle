package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShopeeIntegrationScreen(viewModel: AppViewModel) {
    val state by viewModel.shopeeState.collectAsState()
    var showConnectForm by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadShopeeStatus()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Integrasi Shopee") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
        bottomBar = { BottomNavBar(viewModel, Screen.ShopeeIntegrationScreen) }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                Column(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    if (state.integration == null || !state.integration!!.isActive) {
                        // Not connected
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ShoppingCart,
                                    contentDescription = "Shopee",
                                    modifier = Modifier.size(64.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = "Hubungkan ke Shopee",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Sinkronkan produk dan pesanan dari toko Shopee Anda ke Bizgrow.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = { showConnectForm = true },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Default.Link, "Connect")
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Hubungkan Sekarang")
                                }
                            }
                        }

                        // Instructions
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = "Cara Menghubungkan:",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text("1. Buka Shopee Seller Centre")
                                Text("2. Masuk ke Settings > Advanced Settings > Open API")
                                Text("3. Generate Access Token")
                                Text("4. Salin Shop ID, Shop Name, dan Access Token")
                                Text("5. Klik \"Hubungkan Sekarang\" dan masukkan data")
                            }
                        }
                    } else {
                        // Connected
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                        ) {
                            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.CheckCircle, "Connected", tint = MaterialTheme.colorScheme.primary)
                                    Text(
                                        text = "Terhubung",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                                HorizontalDivider()
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Shop ID:", fontWeight = FontWeight.SemiBold)
                                    Text(state.integration!!.shopId)
                                }
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Shop Name:", fontWeight = FontWeight.SemiBold)
                                    Text(state.integration!!.shopName)
                                }
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Status:", fontWeight = FontWeight.SemiBold)
                                    Text(if (state.integration!!.isActive) "Aktif" else "Nonaktif")
                                }
                                if (!state.integration!!.lastSyncAt.isNullOrBlank()) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Terakhir Sync:", fontWeight = FontWeight.SemiBold)
                                        Text(state.integration!!.lastSyncAt!!)
                                    }
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = { viewModel.disconnectShopee() },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                                ) {
                                    Icon(Icons.Default.LinkOff, "Disconnect")
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Putuskan Koneksi")
                                }
                            }
                        }

                        // Sync status card
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = "Status Sinkronisasi",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text("Produk dari Shopee akan otomatis tersinkronisasi setiap 1 jam.")
                                Text("Pesanan baru akan tersinkronisasi secara real-time.")
                            }
                        }
                    }
                }
            }
        }

        if (showConnectForm) {
            ShopeeConnectDialog(
                onDismiss = { showConnectForm = false },
                onConnect = { shopId, shopName, token ->
                    viewModel.connectShopee(shopId, shopName, token)
                    showConnectForm = false
                }
            )
        }
    }
}

@Composable
fun ShopeeConnectDialog(
    onDismiss: () -> Unit,
    onConnect: (String, String, String) -> Unit
) {
    var shopId by remember { mutableStateOf("") }
    var shopName by remember { mutableStateOf("") }
    var token by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Hubungkan ke Shopee") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = shopId,
                    onValueChange = { shopId = it },
                    label = { Text("Shop ID") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = shopName,
                    onValueChange = { shopName = it },
                    label = { Text("Shop Name") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = token,
                    onValueChange = { token = it },
                    label = { Text("Access Token") },
                    modifier = Modifier.fillMaxWidth().height(100.dp),
                    maxLines = 3
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConnect(shopId, shopName, token) },
                enabled = shopId.isNotBlank() && shopName.isNotBlank() && token.isNotBlank()
            ) {
                Text("Hubungkan")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Batal") }
        }
    )
}
