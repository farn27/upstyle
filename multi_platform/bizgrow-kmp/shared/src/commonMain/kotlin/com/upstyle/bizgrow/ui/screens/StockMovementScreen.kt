package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.StockMovement
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.theme.BizgrowColors

// ─────────────────────────────────────────────────────────────────────────────
// StockMovementScreen — stock movement history for a product
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockMovementScreen(viewModel: AppViewModel, productId: String) {
    val variantsState by viewModel.productVariantsState.collectAsState()
    val movements = variantsState.stockMovements
    val isLoading = variantsState.isLoading
    val error = variantsState.error

    // Type filter
    var filterType by remember { mutableStateOf("Semua") }

    LaunchedEffect(productId) {
        viewModel.loadStockMovements(productId)
    }

    Scaffold(
        containerColor = BizgrowColors.Background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "Riwayat Stok",
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp,
                            color = BizgrowColors.Gray950
                        )
                        Text(
                            "${movements.size} mutasi",
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
                    IconButton(onClick = { viewModel.loadStockMovements(productId) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = BizgrowColors.Gray900)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BizgrowColors.Surface)
            )
        }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {

            // ── Type filter chips ─────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                listOf(
                    "Semua" to "Semua",
                    "PURCHASE" to "Beli",
                    "SALE" to "Jual",
                    "ADJUSTMENT" to "Opname",
                    "RETURN" to "Return"
                ).forEach { (key, label) ->
                    val isSelected = filterType == key
                    Surface(
                        modifier = Modifier.clickable { filterType = key },
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) BizgrowColors.Primary else BizgrowColors.White,
                        contentColor = if (isSelected) BizgrowColors.White else BizgrowColors.Gray700,
                        border = if (!isSelected) BorderStroke(1.dp, BizgrowColors.Gray200) else null
                    ) {
                        Text(
                            text = label,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            // ── Content ───────────────────────────────────────────────────────
            val filtered = if (filterType == "Semua") movements
            else movements.filter { it.type == filterType }

            when {
                isLoading && movements.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BizgrowColors.Primary)
                    }
                }
                error != null && movements.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(Icons.Default.Error, null, Modifier.size(64.dp), tint = BizgrowColors.Danger)
                            Text("Gagal memuat data", color = BizgrowColors.Danger, fontWeight = FontWeight.Medium)
                            TextButton(onClick = { viewModel.loadStockMovements(productId) }) {
                                Text("Coba lagi", color = BizgrowColors.Primary, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
                filtered.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(Icons.Default.History, null, Modifier.size(64.dp), tint = BizgrowColors.Gray300)
                            Text(
                                "Belum ada riwayat mutasi",
                                color = BizgrowColors.Gray500,
                                fontWeight = FontWeight.Medium
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
                        items(filtered, key = { it.id.ifBlank { it.createdAt } }) { movement ->
                            StockMovementItemCard(movement = movement)
                        }
                        item { Spacer(Modifier.height(24.dp)) }
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// StockMovementItemCard
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun StockMovementItemCard(movement: StockMovement) {
    data class TypeInfo(val label: String, val color: androidx.compose.ui.graphics.Color, val icon: androidx.compose.ui.graphics.vector.ImageVector)

    val typeInfo = when (movement.type) {
        "PURCHASE"   -> TypeInfo("Pembelian",  BizgrowColors.Success, Icons.Default.AddCircle)
        "SALE"       -> TypeInfo("Penjualan",  BizgrowColors.Primary, Icons.Default.RemoveCircle)
        "RETURN"     -> TypeInfo("Return",     BizgrowColors.Warning, Icons.Default.Undo)
        "TRANSFER"   -> TypeInfo("Transfer",   BizgrowColors.Gray600, Icons.Default.SwapHoriz)
        "ADJUSTMENT" -> TypeInfo("Opname",     BizgrowColors.Gray700, Icons.Default.Tune)
        else         -> TypeInfo(movement.type, BizgrowColors.Gray600, Icons.Default.Circle)
    }

    val isIncrease = movement.quantity > 0

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Type icon badge
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(typeInfo.color.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    typeInfo.icon,
                    contentDescription = typeInfo.label,
                    tint = typeInfo.color,
                    modifier = Modifier.size(24.dp)
                )
            }

            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(typeInfo.label, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = BizgrowColors.Gray900)
                if (movement.reason.isNotBlank()) {
                    Text(movement.reason, fontSize = 12.sp, color = BizgrowColors.Gray500, maxLines = 1)
                }
                Text(
                    movement.createdAt.take(10),
                    fontSize = 11.sp,
                    color = BizgrowColors.Gray400,
                    fontWeight = FontWeight.Medium
                )
            }

            // Stock delta and before→after
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                val deltaColor = if (isIncrease) BizgrowColors.Success else BizgrowColors.Danger
                val deltaPrefix = if (isIncrease) "+" else ""
                Text(
                    "$deltaPrefix${movement.quantity}",
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    color = deltaColor
                )
                Text(
                    "${movement.stockBefore} → ${movement.stockAfter}",
                    fontSize = 11.sp,
                    color = BizgrowColors.Gray500,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        // Notes row if present
        val notes = movement.notes
        if (!notes.isNullOrBlank()) {
            HorizontalDivider(
                modifier = Modifier.padding(horizontal = 16.dp),
                color = BizgrowColors.Gray100
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.Top
            ) {
                Icon(Icons.Default.Notes, null, modifier = Modifier.size(14.dp), tint = BizgrowColors.Gray400)
                Text(notes, fontSize = 12.sp, color = BizgrowColors.Gray500)
            }
        }
    }
}
