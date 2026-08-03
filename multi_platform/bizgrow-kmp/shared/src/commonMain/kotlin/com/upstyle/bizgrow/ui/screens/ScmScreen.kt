package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.components.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScmScreen(viewModel: AppViewModel) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Supplier", "Purchase Orders")
    val scmData by viewModel.scmData.collectAsStateWithLifecycle()
    val products by viewModel.products.collectAsStateWithLifecycle()
    var showAddSupplier by remember { mutableStateOf(false) }
    var showAddPo by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadScmData(); viewModel.loadProducts() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Column {
                    Text("SCM & Supplier", fontWeight = FontWeight.Bold)
                    Text("${scmData?.suppliers?.size ?: 0} supplier terdaftar", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }},
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { if (selectedTab == 0) showAddSupplier = true else showAddPo = true },
                icon = { Icon(Icons.Default.Add, null) },
                text = { Text(if (selectedTab == 0) "Tambah Supplier" else "Buat PO") }
            )
        },
        bottomBar = { BottomNavBar(viewModel, Screen.Scm) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {

            // Summary
            Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCard("Supplier", "${scmData?.suppliers?.size ?: 0}", icon = Icons.Default.LocalShipping, gradient = BizgrowColors.GradPrimary, modifier = Modifier.weight(1f))
                StatCard("PO Pending", "${scmData?.purchaseOrders?.count { it.status == "DRAFT" || it.status == "SENT" } ?: 0}", icon = Icons.Default.ShoppingBag, gradient = BizgrowColors.GradWarning, modifier = Modifier.weight(1f))
            }

            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { i, t -> Tab(selected = selectedTab == i, onClick = { selectedTab = i }, text = { Text(t) }) }
            }

            when (selectedTab) {
                0 -> SupplierTab(scmData?.suppliers ?: emptyList())
                1 -> PurchaseOrderTab(scmData?.purchaseOrders ?: emptyList(), onUpdateStatus = { id, status -> viewModel.updatePoStatus(id, status) })
            }
        }
    }

    if (showAddSupplier) AddSupplierSheet(onDismiss = { showAddSupplier = false }) { name, contact, phone, email, category, address ->
        viewModel.createSupplier(name, contact, phone, email, category, address)
        showAddSupplier = false
    }

    if (showAddPo) AddPurchaseOrderSheet(
        suppliers = scmData?.suppliers ?: emptyList(),
        products = products,
        onDismiss = { showAddPo = false }
    ) { poNumber, supplierId, productId, qty, unitCost, totalAmount ->
        val unitId = viewModel.activeUnitId.value
        // viewModel.createPurchaseOrder(...)
        showAddPo = false
    }
}

@Composable
fun SupplierTab(suppliers: List<Supplier>) {
    if (suppliers.isEmpty()) { EmptyState(Icons.Default.LocalShipping, "Belum ada supplier", "Tambah supplier pertama"); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(suppliers, key = { it.id }) { supplier ->
            BizCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(46.dp).clip(CircleShape)
                            .background(Brush.linearGradient(BizgrowColors.GradPrimary)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(supplier.name.first().toString(), color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(supplier.name, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(supplier.category.ifEmpty { "Umum" }, style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Primary)
                        if (supplier.phone.isNotEmpty()) Text(supplier.phone, style = MaterialTheme.typography.bodySmall)
                        if (supplier.contactName.isNotEmpty()) Text("Contact: ${supplier.contactName}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                if (supplier.address.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    InfoRow("Alamat", supplier.address, Icons.Default.LocationOn)
                }
                if (supplier.email.isNotEmpty()) {
                    InfoRow("Email", supplier.email, Icons.Default.Email)
                }
            }
        }
    }
}

@Composable
fun PurchaseOrderTab(orders: List<PurchaseOrder>, onUpdateStatus: (String, String) -> Unit) {
    if (orders.isEmpty()) { EmptyState(Icons.Default.ShoppingBag, "Belum ada purchase order"); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(orders, key = { it.id }) { po ->
            BizCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(po.poNumber, fontWeight = FontWeight.Bold)
                        Text("${po.supplierName} · ${po.productName}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${po.qty}x @ ${po.unitCost.toRupiah()}", style = MaterialTheme.typography.bodySmall)
                        Text(po.totalAmount.toRupiah(), fontWeight = FontWeight.Bold, color = BizgrowColors.Primary)
                    }
                    StatusBadge(po.status)
                }
                if (po.status != "RECEIVED" && po.status != "CANCELLED") {
                    Spacer(Modifier.height(10.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        val nextStatuses = when (po.status) {
                            "DRAFT" -> listOf("SENT")
                            "SENT" -> listOf("RECEIVED")
                            else -> emptyList()
                        }
                        items(nextStatuses) { next ->
                            OutlinedButton(onClick = { onUpdateStatus(po.id, next) }, shape = RoundedCornerShape(10.dp)) {
                                Icon(Icons.Default.ArrowForward, null, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Ubah ke $next", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── Sheets ───────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddSupplierSheet(onDismiss: () -> Unit, onSave: (String, String, String, String, String, String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var contactName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Tambah Supplier", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            OutlinedTextField(name, { name = it }, label = { Text("Nama Supplier *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(contactName, { contactName = it }, label = { Text("Nama Kontak") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp))
                OutlinedTextField(phone, { phone = it }, label = { Text("Telepon") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp))
                OutlinedTextField(category, { category = it }, label = { Text("Kategori") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp))
            }
            OutlinedTextField(address, { address = it }, label = { Text("Alamat") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp))
            Button(
                onClick = { if (name.isNotBlank()) onSave(name, contactName, phone, email, category, address) },
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(20.dp)
            ) { Text("Simpan Supplier", fontWeight = FontWeight.Bold) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddPurchaseOrderSheet(
    suppliers: List<Supplier>,
    products: List<com.upstyle.bizgrow.data.Product>,
    onDismiss: () -> Unit,
    onSave: (String, String, String, Int, Double, Double) -> Unit
) {
    var selectedSupplierId by remember { mutableStateOf<String?>(null) }
    var selectedProductId by remember { mutableStateOf<String?>(null) }
    var qty by remember { mutableStateOf("1") }
    var unitCost by remember { mutableStateOf("") }
    var expandedSupplier by remember { mutableStateOf(false) }
    var expandedProduct by remember { mutableStateOf(false) }

    val selectedSupplier = suppliers.find { it.id == selectedSupplierId }
    val selectedProduct = products.find { it.id == selectedProductId }
    val total = (qty.toIntOrNull() ?: 0) * (unitCost.toDoubleOrNull() ?: 0.0)
    val poNumber = "PO-${System.currentTimeMillis().toString().takeLast(6)}"

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Buat Purchase Order", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("No PO: $poNumber", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

            ExposedDropdownMenuBox(expandedSupplier, { expandedSupplier = it }) {
                OutlinedTextField(selectedSupplier?.name ?: "Pilih Supplier", {}, readOnly = true, label = { Text("Supplier *") }, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expandedSupplier) }, modifier = Modifier.menuAnchor().fillMaxWidth(), shape = RoundedCornerShape(20.dp))
                ExposedDropdownMenu(expandedSupplier, { expandedSupplier = false }) {
                    suppliers.forEach { s -> DropdownMenuItem(text = { Text(s.name) }, onClick = { selectedSupplierId = s.id; expandedSupplier = false }) }
                }
            }

            ExposedDropdownMenuBox(expandedProduct, { expandedProduct = it }) {
                OutlinedTextField(selectedProduct?.nama ?: "Pilih Produk", {}, readOnly = true, label = { Text("Produk *") }, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expandedProduct) }, modifier = Modifier.menuAnchor().fillMaxWidth(), shape = RoundedCornerShape(20.dp))
                ExposedDropdownMenu(expandedProduct, { expandedProduct = false }) {
                    products.forEach { p -> DropdownMenuItem(text = { Column { Text(p.nama); Text(p.hargaBeli.toRupiah(), style = MaterialTheme.typography.bodySmall) } }, onClick = { selectedProductId = p.id; unitCost = p.hargaBeli.toString(); expandedProduct = false }) }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(qty, { qty = it }, label = { Text("Qty") }, modifier = Modifier.weight(0.6f), shape = RoundedCornerShape(20.dp), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                OutlinedTextField(unitCost, { unitCost = it }, label = { Text("Harga Satuan") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
            }

            BizCard { Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                Text("Total PO", fontWeight = FontWeight.SemiBold)
                Text(total.toRupiah(), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            }}

            Button(
                onClick = {
                    if (selectedSupplierId != null && selectedProductId != null && qty.isNotBlank())
                        onSave(poNumber, selectedSupplierId!!, selectedProductId!!, qty.toIntOrNull() ?: 1, unitCost.toDoubleOrNull() ?: 0.0, total)
                },
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(20.dp)
            ) { Text("Buat Purchase Order", fontWeight = FontWeight.Bold) }
        }
    }
}
