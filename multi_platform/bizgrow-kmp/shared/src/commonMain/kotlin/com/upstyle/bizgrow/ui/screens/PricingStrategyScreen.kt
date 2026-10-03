package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.PricingStrategy
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.theme.BizgrowColors

// ─────────────────────────────────────────────────────────────────────────────
// PricingStrategyScreen — manage date-bound pricing rules for a product
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PricingStrategyScreen(viewModel: AppViewModel, productId: String) {
    val variantsState by viewModel.productVariantsState.collectAsState()
    val strategies = variantsState.pricingStrategies
        .filter { it.productId == productId }
    val isLoading = variantsState.isLoading
    val error = variantsState.error

    var showAddSheet by remember { mutableStateOf(false) }
    var strategyToEdit by remember { mutableStateOf<PricingStrategy?>(null) }

    LaunchedEffect(productId) {
        viewModel.loadPricingStrategies(productId)
    }

    Scaffold(
        containerColor = BizgrowColors.Background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "Pricing Strategy",
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp,
                            color = BizgrowColors.Gray950
                        )
                        Text(
                            "${strategies.size} aturan aktif",
                            fontSize = 12.sp,
                            color = BizgrowColors.Gray500,
                            fontWeight = FontWeight.Medium
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigate(Screen.Products) }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = BizgrowColors.Gray900)
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadPricingStrategies(productId) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = BizgrowColors.Gray900)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BizgrowColors.Surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { strategyToEdit = null; showAddSheet = true },
                containerColor = BizgrowColors.Primary,
                contentColor = BizgrowColors.White,
                shape = RoundedCornerShape(20.dp),
                elevation = FloatingActionButtonDefaults.elevation(2.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Pricing")
            }
        }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {

            // ── Info banner ───────────────────────────────────────────────────
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                color = BizgrowColors.PrimaryLight,
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(Icons.Default.Info, null, modifier = Modifier.size(18.dp), tint = BizgrowColors.Primary)
                    Text(
                        "Setiap aturan pricing berlaku pada rentang tanggal tertentu. Rentang tanggal tidak boleh tumpang tindih.",
                        fontSize = 12.sp,
                        color = BizgrowColors.Primary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // ── Content ───────────────────────────────────────────────────────
            when {
                isLoading && strategies.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BizgrowColors.Primary)
                    }
                }
                error != null && strategies.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(Icons.Default.Error, null, Modifier.size(64.dp), tint = BizgrowColors.Danger)
                            Text("Gagal memuat data", color = BizgrowColors.Danger, fontWeight = FontWeight.Medium)
                            TextButton(onClick = { viewModel.loadPricingStrategies(productId) }) {
                                Text("Coba lagi", color = BizgrowColors.Primary, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
                strategies.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(Icons.Default.PriceChange, null, Modifier.size(64.dp), tint = BizgrowColors.Gray300)
                            Text(
                                "Belum ada aturan pricing",
                                color = BizgrowColors.Gray500,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                "Tap + untuk menambahkan",
                                color = BizgrowColors.Gray400,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(strategies, key = { it.id.ifBlank { it.name } }) { strategy ->
                            PricingStrategyItemCard(
                                strategy = strategy,
                                onEdit = { strategyToEdit = strategy; showAddSheet = true },
                                onDelete = {
                                    viewModel.deletePricingStrategy(strategy.id, productId)
                                }
                            )
                        }
                        item { Spacer(Modifier.height(80.dp)) }
                    }
                }
            }
        }

        // ── Add / Edit sheet ──────────────────────────────────────────────────
        if (showAddSheet) {
            PricingStrategyFormSheet(
                productId = productId,
                initialStrategy = strategyToEdit,
                onDismiss = { showAddSheet = false },
                onSubmit = { strategy ->
                    viewModel.applyPricingStrategy(strategy)
                    showAddSheet = false
                }
            )
        }

        // ── Error snackbar ────────────────────────────────────────────────────
        error?.let { msg ->
            LaunchedEffect(msg) {
                kotlinx.coroutines.delay(3500)
                viewModel.clearProductVariantsError()
            }
            Box(
                Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                contentAlignment = Alignment.BottomCenter
            ) {
                Snackbar(
                    action = {
                        TextButton(onClick = { viewModel.clearProductVariantsError() }) {
                            Text("Tutup")
                        }
                    }
                ) { Text(msg) }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PricingStrategyItemCard
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun PricingStrategyItemCard(
    strategy: PricingStrategy,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteConfirm by remember { mutableStateOf(false) }

    val typeLabel = when (strategy.type) {
        "FIXED"      -> "Harga Tetap"
        "PERCENTAGE" -> "Diskon %"
        "TIERED"     -> "Harga Bertingkat"
        else         -> strategy.type
    }
    val typeColor = when (strategy.type) {
        "FIXED"      -> BizgrowColors.Primary
        "PERCENTAGE" -> BizgrowColors.Success
        "TIERED"     -> BizgrowColors.Warning
        else         -> BizgrowColors.Gray600
    }
    val valueLabel = when (strategy.type) {
        "PERCENTAGE" -> "${strategy.value.toInt()}%"
        else         -> "Rp ${"%,.0f".format(strategy.value)}"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (strategy.isActive) BizgrowColors.White else BizgrowColors.Gray50
        ),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(color = typeColor.copy(alpha = 0.12f), shape = RoundedCornerShape(8.dp)) {
                        Text(
                            typeLabel,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = typeColor,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    if (!strategy.isActive) {
                        Surface(color = BizgrowColors.Gray200, shape = RoundedCornerShape(8.dp)) {
                            Text(
                                "Nonaktif",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = BizgrowColors.Gray500,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
                Row {
                    IconButton(onClick = onEdit, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Edit, "Edit", tint = BizgrowColors.Gray600, modifier = Modifier.size(18.dp))
                    }
                    IconButton(
                        onClick = { showDeleteConfirm = true },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(Icons.Default.Delete, "Hapus", tint = BizgrowColors.Danger, modifier = Modifier.size(18.dp))
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            Text(
                strategy.name.ifBlank { "Tanpa nama" },
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = BizgrowColors.Gray950
            )

            Spacer(Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Nilai", fontSize = 11.sp, color = BizgrowColors.Gray400, fontWeight = FontWeight.Medium)
                    Text(valueLabel, fontSize = 16.sp, fontWeight = FontWeight.Black, color = BizgrowColors.Primary)
                }
                if (strategy.minQty > 1) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("Min Qty", fontSize = 11.sp, color = BizgrowColors.Gray400, fontWeight = FontWeight.Medium)
                        Text("${strategy.minQty} pcs", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BizgrowColors.Gray700)
                    }
                }
            }

            if (strategy.startDate.isNotBlank() || strategy.endDate.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                HorizontalDivider(color = BizgrowColors.Gray100)
                Spacer(Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.DateRange, null, modifier = Modifier.size(14.dp), tint = BizgrowColors.Gray400)
                    Text(
                        "${strategy.startDate.take(10)} – ${strategy.endDate.take(10)}",
                        fontSize = 12.sp,
                        color = BizgrowColors.Gray500,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }

    // Delete confirmation dialog
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            icon = { Icon(Icons.Default.Warning, null, tint = BizgrowColors.Danger) },
            title = { Text("Hapus Pricing?", fontWeight = FontWeight.Black) },
            text = { Text("Aturan \"${strategy.name.ifBlank { "ini" }}\" akan dihapus permanen.") },
            confirmButton = {
                Button(
                    onClick = { showDeleteConfirm = false; onDelete() },
                    colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Danger)
                ) { Text("Hapus", fontWeight = FontWeight.Bold, color = BizgrowColors.White) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Batal", color = BizgrowColors.Gray600)
                }
            }
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PricingStrategyFormSheet — add / edit a pricing strategy
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PricingStrategyFormSheet(
    productId: String,
    initialStrategy: PricingStrategy?,
    onDismiss: () -> Unit,
    onSubmit: (PricingStrategy) -> Unit
) {
    val isEdit = initialStrategy != null

    var name      by remember { mutableStateOf(initialStrategy?.name ?: "") }
    var type      by remember { mutableStateOf(initialStrategy?.type ?: "FIXED") }
    var value     by remember { mutableStateOf(initialStrategy?.value?.toString() ?: "") }
    var minQty    by remember { mutableStateOf(initialStrategy?.minQty?.toString() ?: "1") }
    var startDate by remember { mutableStateOf(initialStrategy?.startDate ?: "") }
    var endDate   by remember { mutableStateOf(initialStrategy?.endDate ?: "") }
    var isActive  by remember { mutableStateOf(initialStrategy?.isActive ?: true) }
    var typeMenuExpanded by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = BizgrowColors.Surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    if (isEdit) "Edit Pricing" else "Tambah Pricing",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = BizgrowColors.Gray950
                )
                TextButton(onClick = onDismiss) {
                    Text("Batal", color = BizgrowColors.Gray500, fontWeight = FontWeight.Bold)
                }
            }

            HorizontalDivider(color = BizgrowColors.Gray200)

            // Name
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Nama Aturan *") },
                leadingIcon = { Icon(Icons.Default.Label, null, tint = BizgrowColors.Gray400) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BizgrowColors.Primary,
                    unfocusedBorderColor = BizgrowColors.Gray300
                )
            )

            // Type picker
            ExposedDropdownMenuBox(
                expanded = typeMenuExpanded,
                onExpandedChange = { typeMenuExpanded = !typeMenuExpanded }
            ) {
                OutlinedTextField(
                    value = when (type) {
                        "FIXED"      -> "Harga Tetap"
                        "PERCENTAGE" -> "Diskon %"
                        "TIERED"     -> "Harga Bertingkat"
                        else         -> type
                    },
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Tipe Pricing") },
                    leadingIcon = { Icon(Icons.Default.PriceChange, null, tint = BizgrowColors.Gray400) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = typeMenuExpanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BizgrowColors.Primary,
                        unfocusedBorderColor = BizgrowColors.Gray300
                    )
                )
                ExposedDropdownMenu(
                    expanded = typeMenuExpanded,
                    onDismissRequest = { typeMenuExpanded = false }
                ) {
                    listOf(
                        "FIXED"      to "Harga Tetap",
                        "PERCENTAGE" to "Diskon %",
                        "TIERED"     to "Harga Bertingkat"
                    ).forEach { (key, label) ->
                        DropdownMenuItem(
                            text = { Text(label) },
                            onClick = { type = key; typeMenuExpanded = false }
                        )
                    }
                }
            }

            // Value
            OutlinedTextField(
                value = value,
                onValueChange = { value = it },
                label = { Text(if (type == "PERCENTAGE") "Nilai Diskon (%)" else "Nilai Harga (Rp)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                singleLine = true,
                prefix = { if (type != "PERCENTAGE") Text("Rp ", fontSize = 12.sp) },
                suffix = { if (type == "PERCENTAGE") Text("%", fontSize = 12.sp) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BizgrowColors.Primary,
                    unfocusedBorderColor = BizgrowColors.Gray300
                )
            )

            // Min Qty
            OutlinedTextField(
                value = minQty,
                onValueChange = { minQty = it },
                label = { Text("Minimum Qty") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                singleLine = true,
                supportingText = { Text("Berlaku jika qty ≥ nilai ini", fontSize = 11.sp, color = BizgrowColors.Gray400) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BizgrowColors.Primary,
                    unfocusedBorderColor = BizgrowColors.Gray300
                )
            )

            // Date range
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = startDate,
                    onValueChange = { startDate = it },
                    label = { Text("Mulai (YYYY-MM-DD)") },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BizgrowColors.Primary,
                        unfocusedBorderColor = BizgrowColors.Gray300
                    )
                )
                OutlinedTextField(
                    value = endDate,
                    onValueChange = { endDate = it },
                    label = { Text("Selesai (YYYY-MM-DD)") },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BizgrowColors.Primary,
                        unfocusedBorderColor = BizgrowColors.Gray300
                    )
                )
            }

            // Active toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Aktifkan Aturan", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = BizgrowColors.Gray800)
                    Text(
                        if (isActive) "Aturan ini sedang aktif" else "Aturan ini dinonaktifkan",
                        fontSize = 12.sp,
                        color = if (isActive) BizgrowColors.Success else BizgrowColors.Gray400
                    )
                }
                Switch(
                    checked = isActive,
                    onCheckedChange = { isActive = it },
                    colors = SwitchDefaults.colors(checkedThumbColor = BizgrowColors.White, checkedTrackColor = BizgrowColors.Success)
                )
            }

            HorizontalDivider(color = BizgrowColors.Gray200)

            Button(
                onClick = {
                    val strategy = PricingStrategy(
                        id        = initialStrategy?.id ?: "",
                        productId = productId,
                        name      = name.trim(),
                        type      = type,
                        value     = value.toDoubleOrNull() ?: 0.0,
                        startDate = startDate.trim(),
                        endDate   = endDate.trim(),
                        minQty    = minQty.toIntOrNull() ?: 1,
                        isActive  = isActive
                    )
                    onSubmit(strategy)
                },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(20.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary),
                enabled = name.isNotBlank() && value.isNotBlank()
            ) {
                Icon(Icons.Default.Save, null, tint = BizgrowColors.White)
                Spacer(Modifier.width(8.dp))
                Text(
                    if (isEdit) "Simpan Perubahan" else "Tambah Aturan",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = BizgrowColors.White
                )
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}
