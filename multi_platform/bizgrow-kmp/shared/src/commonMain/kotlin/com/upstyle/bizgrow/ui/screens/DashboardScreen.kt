package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.BiMetrics
import com.upstyle.bizgrow.data.FinanceData
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(viewModel: AppViewModel) {
    val activeUnit by viewModel.activeUnit.collectAsStateWithLifecycle()
    val financeData by viewModel.financeData.collectAsStateWithLifecycle()
    val lowStockProducts by viewModel.lowStockProducts.collectAsStateWithLifecycle()
    val unreadCount by viewModel.unreadCount.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.refreshAll() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(
                            modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp))
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = activeUnit?.name?.take(1)?.uppercase() ?: "B",
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.primary,
                                fontSize = 16.sp
                            )
                        }
                        Column {
                            Text(activeUnit?.name ?: "Dashboard", fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 15.sp)
                            Text(activeUnit?.type ?: "Bizgrow", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                },
                actions = {
                    Box {
                        IconButton(onClick = { viewModel.navigate(Screen.Notifications) }) {
                            Icon(Icons.Default.Notifications, null)
                        }
                        if (unreadCount > 0) {
                            Badge(modifier = Modifier.align(Alignment.TopEnd).padding(top = 6.dp, end = 6.dp)) {
                                Text(if (unreadCount > 9) "9+" else unreadCount.toString())
                            }
                        }
                    }
                    IconButton(onClick = { viewModel.navigate(Screen.Settings) }) {
                        Icon(Icons.Default.Settings, null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        bottomBar = { BottomNavBar(viewModel, Screen.Dashboard) },
        containerColor = MaterialTheme.colorScheme.background
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Hero Finance Card
            item { DashboardHeroCard(financeData, viewModel) }
            // Cash flow chart
            item { FinanceChart(financeData) }
            // Alerts
            item {
                AlertsSection(
                    financeData = financeData,
                    lowStockProducts = lowStockProducts,
                    viewModel = viewModel
                )
            }
            // BI Metrics
            financeData?.biMetrics?.let { metrics ->
                item { BiMetricsSection(metrics) }
            }
            // Quick Actions
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Menu Utama", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
                Spacer(Modifier.height(10.dp))
                QuickActionsGrid(viewModel)
            }
            // Recent transactions
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Transaksi Terbaru", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    TextButton(onClick = { viewModel.navigate(Screen.Finance) }) { Text("Lihat Semua", fontSize = 12.sp) }
                }
            }
            financeData?.transactions?.take(5)?.let { transactions ->
                if (transactions.isEmpty()) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), contentAlignment = Alignment.Center) {
                            Text("Belum ada transaksi", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                } else {
                    items(transactions) { trx -> TransactionItem(trx) }
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

// ─── Hero Card ────────────────────────────────────────────────────────────────
@Composable
fun DashboardHeroCard(financeData: FinanceData?, viewModel: AppViewModel) {
    val trxs = financeData?.transactions ?: emptyList()
    val totalIncome = trxs.filter { it.kategoriTrx.equals("PEMASUKAN", ignoreCase = true) }.sumOf { it.nominal }
    val totalExpense = trxs.filter { it.kategoriTrx.equals("PENGELUARAN", ignoreCase = true) }.sumOf { it.nominal }
    val balance = totalIncome - totalExpense
    val isPositive = balance >= 0

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        if (isPositive) listOf(Color(0xFF5B50F0), Color(0xFF8B5CF6))
                        else listOf(Color(0xFFDC2626), Color(0xFFEF4444))
                    ),
                    shape = RoundedCornerShape(20.dp)
                )
                .padding(20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                    Column {
                        Text("Saldo Bersih", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                        Text(
                            formatCurrency(balance),
                            fontSize = 28.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                    }
                    Surface(color = Color.White.copy(alpha = 0.2f), shape = RoundedCornerShape(10.dp)) {
                        Icon(
                            if (isPositive) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                            null,
                            Modifier.padding(8.dp).size(20.dp),
                            tint = Color.White
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    MiniStatChip("Masuk", formatCurrency(totalIncome), Color.White, isGood = true)
                    MiniStatChip("Keluar", formatCurrency(totalExpense), Color.White, isGood = false)
                    MiniStatChip("Transaksi", "${trxs.size}x", Color.White)
                }
            }
        }
    }
}

@Composable
fun MiniStatChip(label: String, value: String, textColor: Color, isGood: Boolean? = null) {
    Column {
        Text(label, fontSize = 11.sp, color = textColor.copy(alpha = 0.7f))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            isGood?.let {
                Icon(
                    if (it) Icons.Default.ArrowDropUp else Icons.Default.ArrowDropDown,
                    null, Modifier.size(16.dp),
                    tint = if (it) Color(0xFF86EFAC) else Color(0xFFFCA5A5)
                )
            }
            Text(value, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = textColor, maxLines = 1)
        }
    }
}

// ─── Cash Flow Chart ──────────────────────────────────────────────────────────
@Composable
fun FinanceChart(financeData: FinanceData?) {
    val dataPoints = remember(financeData) {
        val trxs = financeData?.transactions ?: emptyList()
        val grouped = trxs
            .filter { it.kategoriTrx.equals("PEMASUKAN", ignoreCase = true) }
            .sortedBy { it.tanggal }
            .groupBy { it.tanggal.take(10) }
            .entries.sortedBy { it.key }
            .takeLast(7)
            .map { (_, v) -> v.sumOf { it.nominal }.toFloat() }
        when {
            grouped.isEmpty() -> listOf(0f, 0f, 0f, 0f, 0f, 0f, 0f)
            grouped.size == 1 -> listOf(0f, grouped.first())
            else -> grouped
        }
    }

    val animProg = remember { Animatable(0f) }
    LaunchedEffect(dataPoints) {
        animProg.snapTo(0f)
        animProg.animateTo(1f, tween(1000, easing = FastOutSlowInEasing))
    }

    val maxVal = dataPoints.maxOrNull()?.takeIf { it > 0 } ?: 1f
    val totalStr = formatCurrency(dataPoints.sum().toDouble())

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("Cash Flow", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text("7 hari terakhir", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(totalStr, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.height(16.dp))
            Canvas(modifier = Modifier.fillMaxWidth().height(100.dp)) {
                val w = size.width; val h = size.height
                val count = dataPoints.size
                if (count < 2) {
                    // Draw flat line if no data
                    drawLine(Color(0xFF6366F1).copy(alpha = 0.3f), Offset(0f, h * 0.5f), Offset(w, h * 0.5f), strokeWidth = 2.dp.toPx())
                    return@Canvas
                }
                val spacing = w / (count - 1)
                val pts = dataPoints.mapIndexed { i, v ->
                    Offset(i * spacing, h - (v / maxVal) * h * 0.85f - h * 0.075f)
                }
                val fillPath = Path().apply {
                    moveTo(pts[0].x, pts[0].y)
                    for (i in 1 until pts.size) {
                        val cp = (pts[i-1].x + pts[i].x) / 2f
                        cubicTo(cp, pts[i-1].y, cp, pts[i].y, pts[i].x, pts[i].y)
                    }
                    lineTo(pts.last().x, h); lineTo(pts.first().x, h); close()
                }
                val linePath = Path().apply {
                    moveTo(pts[0].x, pts[0].y)
                    for (i in 1 until pts.size) {
                        val cp = (pts[i-1].x + pts[i].x) / 2f
                        cubicTo(cp, pts[i-1].y, cp, pts[i].y, pts[i].x, pts[i].y)
                    }
                }
                clipRect(right = w * animProg.value) {
                    drawPath(fillPath, Brush.verticalGradient(listOf(Color(0xFF5B50F0).copy(alpha = 0.25f), Color.Transparent), 0f, h))
                    drawPath(linePath, Brush.linearGradient(listOf(Color(0xFF5B50F0), Color(0xFF8B5CF6))),
                        style = Stroke(3.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
                    pts.forEach {
                        drawCircle(Color.White, 4.dp.toPx(), it)
                        drawCircle(Color(0xFF5B50F0), 2.5.dp.toPx(), it)
                    }
                }
            }
        }
    }
}

// ─── BI Metrics ───────────────────────────────────────────────────────────────
@Composable
fun BiMetricsSection(metrics: BiMetrics) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Business Insights", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(8.dp)) {
                Text(metrics.outlook, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            BiMetricCard("Laba Bersih", formatCurrency(metrics.netProfit), Icons.Default.TrendingUp,
                Brush.linearGradient(BizgrowColors.GradPrimary), Modifier.weight(1f))
            BiMetricCard("Margin", "${metrics.margin}%", Icons.Default.PieChart,
                Brush.linearGradient(BizgrowColors.GradSuccess), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            BiMetricCard("Cash Runway", "${metrics.cashRunway} bln", Icons.Default.Timeline,
                Brush.linearGradient(BizgrowColors.GradWarning), Modifier.weight(1f))
            BiMetricCard("Health Score", "${metrics.integrityScore}", Icons.Default.Favorite,
                Brush.linearGradient(BizgrowColors.GradDark), Modifier.weight(1f))
        }
    }
}

@Composable
fun BiMetricCard(title: String, value: String, icon: ImageVector, gradient: Brush, modifier: Modifier = Modifier) {
    Card(modifier = modifier.height(90.dp), shape = RoundedCornerShape(16.dp), elevation = CardDefaults.cardElevation(2.dp)) {
        Box(Modifier.fillMaxSize().background(gradient).padding(14.dp)) {
            Icon(icon, null, Modifier.size(16.dp).align(Alignment.TopEnd), tint = Color.White.copy(alpha = 0.7f))
            Column(Modifier.align(Alignment.BottomStart), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(title, fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
                Text(value, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
@Composable
fun AlertsSection(financeData: FinanceData?, lowStockProducts: List<com.upstyle.bizgrow.data.LowStockProduct>, viewModel: AppViewModel) {
    val alerts = buildList {
        if ((financeData?.alerts?.receivables ?: 0) > 0)
            add(Triple("${financeData?.alerts?.receivables} piutang jatuh tempo", Color(0xFFF59E0B), Screen.Piutang))
        if ((financeData?.alerts?.payables ?: 0) > 0)
            add(Triple("${financeData?.alerts?.payables} hutang jatuh tempo", Color(0xFFEF4444), Screen.Hutang))
        if (lowStockProducts.isNotEmpty())
            add(Triple("${lowStockProducts.size} produk stok menipis", Color(0xFFF97316), Screen.Products))
    }
    if (alerts.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        alerts.forEach { (msg, color, screen) ->
            Card(
                modifier = Modifier.fillMaxWidth().clickable { viewModel.navigate(screen) },
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f)),
                elevation = CardDefaults.cardElevation(0.dp)
            ) {
                Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Warning, null, Modifier.size(18.dp), tint = color)
                    Spacer(Modifier.width(10.dp))
                    Text(msg, color = color, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.weight(1f))
                    Icon(Icons.Default.ChevronRight, null, Modifier.size(18.dp), tint = color)
                }
            }
        }
    }
}

// ─── Quick Actions Grid ───────────────────────────────────────────────────────
@Composable
fun QuickActionsGrid(viewModel: AppViewModel) {
    data class Action(val label: String, val icon: ImageVector, val screen: Screen, val gradient: List<Color>)
    val actions = listOf(
        Action("Keuangan",   Icons.Default.AccountBalanceWallet, Screen.Finance,   BizgrowColors.GradPrimary),
        Action("POS Kasir",  Icons.Default.PointOfSale,          Screen.Pos,       BizgrowColors.GradSuccess),
        Action("Produk",     Icons.Default.Inventory2,           Screen.Products,  BizgrowColors.GradOcean),
        Action("HR & Absen", Icons.Default.People,               Screen.Hr,        BizgrowColors.GradWarning),
        Action("CRM",        Icons.Default.Contacts,             Screen.Crm,       BizgrowColors.GradRose),
        Action("Supply",     Icons.Default.LocalShipping,        Screen.Scm,       BizgrowColors.GradEmerald),
        Action("Pesanan",    Icons.Default.ShoppingCart,         Screen.Orders,    BizgrowColors.GradDark),
        Action("AI Chat",    Icons.Default.SmartToy,             Screen.AiChat,    BizgrowColors.GradPrimary),
        Action("Piutang",    Icons.Default.Receipt,              Screen.Piutang,   BizgrowColors.GradWarning),
        Action("Hutang",     Icons.Default.MoneyOff,             Screen.Hutang,    BizgrowColors.GradDanger),
        Action("Laporan",    Icons.Default.Assessment,           Screen.Laporan,   BizgrowColors.GradDark),
        Action("Support",    Icons.Default.Inbox,                Screen.CsInbox,   BizgrowColors.GradOcean),
    )

    LazyVerticalGrid(
        columns = GridCells.Fixed(4),
        modifier = Modifier.height(280.dp),
        userScrollEnabled = false,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        itemsIndexed(actions) { _, action ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.clickable { viewModel.navigate(action.screen) }
            ) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Brush.linearGradient(action.gradient)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(action.icon, null, Modifier.size(24.dp), tint = Color.White)
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    action.label,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }
        }
    }
}

// ─── Transaction Item ─────────────────────────────────────────────────────────
@Composable
fun TransactionItem(trx: com.upstyle.bizgrow.data.Transaction) {
    val isMasuk = trx.kategoriTrx.equals("PEMASUKAN", ignoreCase = true) || trx.kategoriTrx.equals("MASUK", ignoreCase = true)
    val color = if (isMasuk) Color(0xFF22C55E) else Color(0xFFEF4444)

    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(color.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                if (isMasuk) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                null, Modifier.size(18.dp), tint = color
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(trx.keterangan, fontWeight = FontWeight.Medium, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(trx.tanggal.take(10), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(
                "${if (isMasuk) "+" else "-"}${formatCurrency(trx.nominal)}",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = color
            )
            Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(4.dp)) {
                Text(trx.metodeBayar, fontSize = 9.sp, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
fun formatCurrency(amount: Double): String = "Rp ${"%,.0f".format(amount)}"

@Composable
fun DateFilterRow(viewModel: AppViewModel) {
    var isExpanded by remember { mutableStateOf(false) }
    var selectedFilter by remember { mutableStateOf("Bulan Ini") }
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text("Ringkasan", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Box {
            OutlinedButton(
                onClick = { isExpanded = true },
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(selectedFilter, fontSize = 12.sp)
                Icon(Icons.Default.ArrowDropDown, null, Modifier.size(16.dp))
            }
            DropdownMenu(expanded = isExpanded, onDismissRequest = { isExpanded = false }) {
                listOf("Hari Ini", "Minggu Ini", "Bulan Ini", "Semua").forEach { f ->
                    DropdownMenuItem(text = { Text(f) }, onClick = { selectedFilter = f; isExpanded = false; viewModel.loadFinanceData() })
                }
            }
        }
    }
}

// Kept for FinanceSummaryCards compatibility
@Composable
fun FinanceSummaryCards(summary: com.upstyle.bizgrow.data.FinanceSummary) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5)), shape = RoundedCornerShape(14.dp), elevation = CardDefaults.cardElevation(0.dp)) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Total Masuk", fontSize = 11.sp, color = Color(0xFF059669))
                Text(formatCurrency(summary.totalMasuk), fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF065F46), maxLines = 1)
            }
        }
        Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)), shape = RoundedCornerShape(14.dp), elevation = CardDefaults.cardElevation(0.dp)) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Total Keluar", fontSize = 11.sp, color = Color(0xFFDC2626))
                Text(formatCurrency(summary.totalKeluar), fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFFB91C1C), maxLines = 1)
            }
        }
    }
}

// Kept for QuickViewCards compatibility
@Composable
fun QuickViewCards(financeData: FinanceData) {
    val trxs = financeData.transactions
    val totalIncome = trxs.filter { it.kategoriTrx.equals("PEMASUKAN", ignoreCase = true) }.sumOf { it.nominal }
    val totalExpense = trxs.filter { it.kategoriTrx.equals("PENGELUARAN", ignoreCase = true) }.sumOf { it.nominal }
    val totalBalance = totalIncome - totalExpense
    val isPositive = totalBalance >= 0
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5)), shape = RoundedCornerShape(14.dp), elevation = CardDefaults.cardElevation(0.dp)) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.TrendingUp, null, Modifier.size(13.dp), tint = Color(0xFF059669))
                    Text("Pemasukan", fontSize = 10.sp, color = Color(0xFF059669))
                }
                Text(formatCurrency(totalIncome), fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = Color(0xFF065F46))
            }
        }
        Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = if (isPositive) MaterialTheme.colorScheme.primaryContainer else Color(0xFFFEF2F2)), shape = RoundedCornerShape(14.dp), elevation = CardDefaults.cardElevation(0.dp)) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.AccountBalance, null, Modifier.size(13.dp), tint = if (isPositive) MaterialTheme.colorScheme.primary else Color(0xFFDC2626))
                    Text("Saldo", fontSize = 10.sp, color = if (isPositive) MaterialTheme.colorScheme.primary else Color(0xFFDC2626))
                }
                Text(formatCurrency(totalBalance), fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = if (isPositive) MaterialTheme.colorScheme.onPrimaryContainer else Color(0xFFB91C1C))
            }
        }
    }
}

// Alert card for standalone use
@Composable
fun AlertCard(message: String, icon: ImageVector, color: Color, onClick: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().clickable { onClick() }, colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f)), shape = RoundedCornerShape(12.dp), elevation = CardDefaults.cardElevation(0.dp)) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(36.dp).clip(CircleShape).background(color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(12.dp))
            Text(message, color = color, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.weight(1f))
            Icon(Icons.Default.ChevronRight, null, tint = color, modifier = Modifier.size(18.dp))
        }
    }
}

// BiMetricsSection compat
@Composable
fun GradientBiCard(title: String, value: String, gradient: Brush, icon: ImageVector, modifier: Modifier = Modifier) {
    BiMetricCard(title, value, icon, gradient, modifier)
}
