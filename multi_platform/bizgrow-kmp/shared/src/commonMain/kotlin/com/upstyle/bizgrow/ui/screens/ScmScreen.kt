package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
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
import androidx.compose.animation.AnimatedVisibility

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScmScreen(viewModel: AppViewModel) {
    var selectedTabIndex by remember { mutableStateOf(0) }
    val tabs = listOf("Supplier", "Purchase Orders")
    val scmData by viewModel.scmData.collectAsStateWithLifecycle()
    
    var showAddSupplierSheet by remember { mutableStateOf(false) }
    var showAddPoSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadScmData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SCM & Supplier") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { 
                if (selectedTabIndex == 0) showAddSupplierSheet = true else showAddPoSheet = true 
            }) {
                Icon(Icons.Default.Add, contentDescription = "Tambah")
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = selectedTabIndex) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTabIndex == index,
                        onClick = { selectedTabIndex = index },
                        text = { Text(title) }
                    )
                }
            }

            if (selectedTabIndex == 0) {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val suppliers = scmData?.suppliers ?: emptyList()
                    items(suppliers) { supplier ->
                        Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(supplier.name, fontWeight = FontWeight.Bold)
                                Text("${supplier.category} | ${supplier.phone}", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }

            AnimatedVisibility(visible = selectedTabIndex == 1) {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val pos = scmData?.purchaseOrders ?: emptyList()
                    items(pos) { po ->
                        Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                            Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                Column {
                                    Text(po.poNumber, fontWeight = FontWeight.Bold)
                                    Text("${po.supplierName} | Rp ${"%,.0f".format(po.totalAmount)}", style = MaterialTheme.typography.bodySmall)
                                }
                                Surface(color = if (po.status.equals("PENDING", ignoreCase = true)) Color(0xFFEF6C00).copy(alpha = 0.1f) else Color(0xFF2E7D32).copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
                                    Text(po.status, color = if (po.status.equals("PENDING", ignoreCase = true)) Color(0xFFEF6C00) else Color(0xFF2E7D32), modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    if (showAddSupplierSheet) {
        ModalBottomSheet(onDismissRequest = { showAddSupplierSheet = false }) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Tambah Supplier", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 16.dp))
                var name by remember { mutableStateOf("") }
                var category by remember { mutableStateOf("") }
                var phone by remember { mutableStateOf("") }
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Nama Supplier") }, modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp))
                OutlinedTextField(value = category, onValueChange = { category = it }, label = { Text("Kategori") }, modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp))
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("No Telepon") }, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp))
                Button(onClick = { viewModel.createSupplier(name, "-", phone, "-", category, "-"); showAddSupplierSheet = false }, modifier = Modifier.fillMaxWidth()) {
                    Text("Simpan Supplier")
                }
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}
