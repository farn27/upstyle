package com.example.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScmScreen(
    viewModel: SaaSViewModel,
    modifier: Modifier = Modifier
) {
    val suppliers by viewModel.suppliers.collectAsStateWithLifecycle()
    val purchaseOrders by viewModel.purchaseOrders.collectAsStateWithLifecycle()
    val products by viewModel.products.collectAsStateWithLifecycle()

    var selectedTab by remember { mutableStateOf(0) }
    val tabTitles = listOf("Daftar Supplier", "Purchase Orders")

    var showAddSupplierDialog by remember { mutableStateOf(false) }
    var showCreatePoDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Supply Chain & Vendor", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateTo(Screen.Settings) }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Kembali ke Menu")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        floatingActionButton = {
            if (selectedTab == 0) {
                ExtendedFloatingActionButton(
                    text = { Text("Tambah Supplier") },
                    icon = { Icon(Icons.Default.Add, contentDescription = "Add Supplier") },
                    onClick = { showAddSupplierDialog = true },
                    modifier = Modifier.testTag("add_supplier_fab"),
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                ExtendedFloatingActionButton(
                    text = { Text("Buat PO") },
                    icon = { Icon(Icons.Default.Receipt, contentDescription = "Create PO") },
                    onClick = { showCreatePoDialog = true },
                    modifier = Modifier.testTag("create_po_fab"),
                    containerColor = MaterialTheme.colorScheme.secondary,
                    contentColor = MaterialTheme.colorScheme.onSecondary
                )
            }
        }
    ) { innerPadding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Tab Header
            TabRow(selectedTabIndex = selectedTab) {
                tabTitles.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title, fontWeight = FontWeight.SemiBold) }
                    )
                }
            }

            if (selectedTab == 0) {
                // SUPPLIER DIRECTORY LIST
                if (suppliers.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.Business,
                                contentDescription = "Empty",
                                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                                modifier = Modifier.size(64.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "Belum ada Supplier terdaftar",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .weight(1f)
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(suppliers) { supplier ->
                            SupplierCard(
                                supplier = supplier,
                                onDelete = { viewModel.deleteSupplier(supplier.id, supplier.name) }
                            )
                        }
                    }
                }
            } else {
                // PURCHASE ORDER LIST
                if (purchaseOrders.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.Description,
                                contentDescription = "Empty",
                                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                                modifier = Modifier.size(64.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "Belum ada Purchase Order (PO)",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .weight(1f)
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(purchaseOrders) { po ->
                            PoCard(
                                po = po,
                                onStatusUpdate = { id, status -> viewModel.updatePoStatus(id, status) }
                            )
                        }
                    }
                }
            }
        }
    }

    // --- ADD SUPPLIER DIALOG ---
    if (showAddSupplierDialog) {
        var name by remember { mutableStateOf("") }
        var contact by remember { mutableStateOf("") }
        var phone by remember { mutableStateOf("") }
        var email by remember { mutableStateOf("") }
        var category by remember { mutableStateOf("") }
        var address by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showAddSupplierDialog = false },
            title = { Text("Daftarkan Supplier Baru") },
            text = {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    item {
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text("Nama Perusahaan / Supplier") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = contact,
                            onValueChange = { contact = it },
                            label = { Text("Nama Kontak (Sales/PIC)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = phone,
                            onValueChange = { phone = it },
                            label = { Text("No. Telepon / WhatsApp") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            label = { Text("Alamat Email") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = category,
                            onValueChange = { category = it },
                            label = { Text("Kategori Produk (e.g. Sembako)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = address,
                            onValueChange = { address = it },
                            label = { Text("Alamat Kantor / Gudang") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 2
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotEmpty() && contact.isNotEmpty() && phone.isNotEmpty()) {
                            viewModel.addSupplier(name, contact, phone, email, category, address)
                            showAddSupplierDialog = false
                        }
                    }
                ) {
                    Text("Simpan Supplier")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddSupplierDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }

    // --- CREATE PO DIALOG ---
    if (showCreatePoDialog) {
        var selectedSupplierIndex by remember { mutableStateOf(0) }
        var selectedProductIndex by remember { mutableStateOf(0) }
        var qtyStr by remember { mutableStateOf("") }
        var costStr by remember { mutableStateOf("") }

        var showSupplierDropdown by remember { mutableStateOf(false) }
        var showProductDropdown by remember { mutableStateOf(false) }

        val activeSupplier = suppliers.getOrNull(selectedSupplierIndex)
        val activeProduct = products.getOrNull(selectedProductIndex)

        // Sync default unit cost of product
        LaunchedEffect(activeProduct) {
            activeProduct?.let {
                costStr = it.hargaBeli.toInt().toString()
            }
        }

        AlertDialog(
            onDismissRequest = { showCreatePoDialog = false },
            title = { Text("Buat Purchase Order Baru") },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (suppliers.isEmpty()) {
                        Text("Silakan daftarkan supplier terlebih dahulu.", color = MaterialTheme.colorScheme.error)
                    } else if (products.isEmpty()) {
                        Text("Tidak ada produk di katalog aktif untuk direstok.", color = MaterialTheme.colorScheme.error)
                    } else {
                        // Supplier Selector
                        Column {
                            Text("Pilih Supplier", style = MaterialTheme.typography.labelMedium)
                            Spacer(modifier = Modifier.height(4.dp))
                            Box {
                                OutlinedCard(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { showSupplierDropdown = true },
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(activeSupplier?.name ?: "Pilih Supplier")
                                        Icon(Icons.Default.ArrowDropDown, contentDescription = "expand")
                                    }
                                }
                                DropdownMenu(
                                    expanded = showSupplierDropdown,
                                    onDismissRequest = { showSupplierDropdown = false }
                                ) {
                                    suppliers.forEachIndexed { idx, s ->
                                        DropdownMenuItem(
                                            text = { Text(s.name) },
                                            onClick = {
                                                selectedSupplierIndex = idx
                                                showSupplierDropdown = false
                                            }
                                        )
                                    }
                                }
                            }
                        }

                        // Product Selector
                        Column {
                            Text("Pilih Produk yang Diorder", style = MaterialTheme.typography.labelMedium)
                            Spacer(modifier = Modifier.height(4.dp))
                            Box {
                                OutlinedCard(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { showProductDropdown = true },
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(activeProduct?.nama ?: "Pilih Produk")
                                        Icon(Icons.Default.ArrowDropDown, contentDescription = "expand")
                                    }
                                }
                                DropdownMenu(
                                    expanded = showProductDropdown,
                                    onDismissRequest = { showProductDropdown = false }
                                ) {
                                    products.forEachIndexed { idx, p ->
                                        DropdownMenuItem(
                                            text = { Text("${p.nama} (Stok: ${p.stok})") },
                                            onClick = {
                                                selectedProductIndex = idx
                                                showProductDropdown = false
                                            }
                                        )
                                    }
                                }
                            }
                        }

                        // Qty Input
                        OutlinedTextField(
                            value = qtyStr,
                            onValueChange = { qtyStr = it },
                            label = { Text("Jumlah Order (Qty)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        // Cost Input
                        OutlinedTextField(
                            value = costStr,
                            onValueChange = { costStr = it },
                            label = { Text("Harga Beli Per Unit (Rp)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        if (qtyStr.isNotEmpty() && costStr.isNotEmpty()) {
                            val qtyVal = qtyStr.toIntOrNull() ?: 0
                            val costVal = costStr.toDoubleOrNull() ?: 0.0
                            val totalVal = qtyVal * costVal
                            Text(
                                text = "Estimasi Nilai PO: Rp ${String.format("%,.0f", totalVal)}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            },
            confirmButton = {
                if (suppliers.isNotEmpty() && products.isNotEmpty()) {
                    Button(
                        onClick = {
                            val qtyVal = qtyStr.toIntOrNull() ?: 0
                            val costVal = costStr.toDoubleOrNull() ?: 0.0
                            if (activeSupplier != null && activeProduct != null && qtyVal > 0 && costVal > 0.0) {
                                viewModel.createPurchaseOrder(
                                    supplierId = activeSupplier.id,
                                    supplierName = activeSupplier.name,
                                    productId = activeProduct.id,
                                    productName = activeProduct.nama,
                                    qty = qtyVal,
                                    unitCost = costVal
                                )
                                showCreatePoDialog = false
                            }
                        }
                    ) {
                        Text("Buat PO (Draft)")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreatePoDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
}

@Composable
fun SupplierCard(
    supplier: Supplier,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = supplier.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = supplier.category,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }

                IconButton(onClick = onDelete) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Hapus Supplier",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(12.dp))

            // Details
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Person, contentDescription = "PIC", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(supplier.contactName, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Phone, contentDescription = "Phone", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(supplier.phone, style = MaterialTheme.typography.bodySmall)
                    }
                }

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Email, contentDescription = "Email", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(supplier.email.ifEmpty { "-" }, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, contentDescription = "Address", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(supplier.address, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
}

@Composable
fun PoCard(
    po: PurchaseOrder,
    onStatusUpdate: (String, String) -> Unit
) {
    val dateFormat = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // PO Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = po.poNumber,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = dateFormat.format(Date(po.date)),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Status Badge
                val (bgColor, textColor, label) = when (po.status) {
                    "DRAFT" -> Triple(Color(0xFFFFF9C4), Color(0xFFF57F17), "DRAFT")
                    "SENT" -> Triple(Color(0xFFE3F2FD), Color(0xFF1565C0), "DIKIRIM")
                    "RECEIVED" -> Triple(Color(0xFFE8F5E9), Color(0xFF2E7D32), "DITERIMA")
                    else -> Triple(Color.LightGray, Color.DarkGray, po.status)
                }
                Surface(
                    color = bgColor,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = textColor,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(12.dp))

            // PO Details
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Supplier:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(po.supplierName, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Produk:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(po.productName, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Jumlah (Qty):", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${po.qty} Unit", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Harga/Unit:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Rp ${String.format("%,.0f", po.unitCost)}", style = MaterialTheme.typography.bodySmall)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Total Nilai PO:", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Rp ${String.format("%,.0f", po.totalAmount)}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }
            }

            // Actions buttons based on status
            if (po.status != "RECEIVED") {
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    if (po.status == "DRAFT") {
                        Button(
                            onClick = { onStatusUpdate(po.id, "SENT") },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Icon(Icons.Default.Send, contentDescription = "Send", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Kirim ke Supplier", fontSize = 12.sp)
                        }
                    } else if (po.status == "SENT") {
                        Button(
                            onClick = { onStatusUpdate(po.id, "RECEIVED") },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = "Received", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Konfirmasi Diterima", fontSize = 12.sp, color = Color.White)
                        }
                    }
                }
            } else {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Success",
                        tint = Color(0xFF2E7D32),
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Stok otomatis bertambah & pengeluaran tercatat di kasir",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF2E7D32),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}
