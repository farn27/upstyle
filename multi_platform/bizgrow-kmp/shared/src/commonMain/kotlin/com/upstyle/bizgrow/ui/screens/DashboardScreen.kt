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
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.BiMetrics
import com.upstyle.bizgrow.data.FinanceData
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(viewModel: AppViewModel) {
    val activeUnit by viewModel.activeUnit.collectAsState()
    val financeData by viewModel.financeData.collectAsState()
    val lowStockProducts by viewModel.lowStockProducts.collectAsState()
    val unreadCount by viewModel.unreadCount.collectAsState()

    LaunchedEffect(Unit) { viewModel.refreshAll() }

    Scaffold(
        containerColor = BizgrowColors.Background,
        bottomBar = { BottomNavBar(viewModel, Screen.Dashboard) },
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            item {
                // Header
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 24.dp, end = 24.dp, top = 48.dp, bottom = 16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "👋 Selamat Pagi",
                                style = MaterialTheme.typography.titleMedium,
                                color = BizgrowColors.Gray500,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = activeUnit?.name ?: "Bisnis",
                                    style = MaterialTheme.typography.displayLarge.copy(fontSize = 24.sp),
                                    color = BizgrowColors.Gray950,
                                )
                                Surface(color = BizgrowColors.SuccessLight, shape = RoundedCornerShape(6.dp)) {
                                    Text("Online", color = BizgrowColors.Success, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                }
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box {
                                IconButton(onClick = { viewModel.navigate(Screen.Notifications) }) {
                                    Icon(Icons.Default.Notifications, "Notifikasi", tint = BizgrowColors.Gray500)
                                }
                                if (unreadCount > 0) {
                                    Box(modifier = Modifier.align(Alignment.TopEnd).padding(top = 8.dp, end = 8.dp).size(8.dp).background(BizgrowColors.Danger, CircleShape))
                                }
                            }
                            IconButton(onClick = { viewModel.navigate(Screen.Settings) }) {
                                Icon(Icons.Default.Settings, "Pengaturan", tint = BizgrowColors.Gray500)
                            }
                        }
                    }
                }
            }
            
            // AI Insight
            item {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = BizgrowColors.PrimaryLight),
                    shape = RoundedCornerShape(20.dp),
                    elevation = CardDefaults.cardElevation(0.dp)
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AutoAwesome, "AI", tint = BizgrowColors.Primary, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        val insight = remember(financeData) {
                            val trxs = financeData?.transactions ?: emptyList()
                            val income = trxs.filter { it.kategoriTrx.equals("PEMASUKAN", ignoreCase = true) }.sumOf { it.nominal }
                            val count = trxs.size
                            when {
                                count == 0 -> "Belum ada transaksi hari ini. Mulai catat penjualan Anda!"
                                income > 0 -> "Total pemasukan saat ini ${formatCurrency(income)} dari $count transaksi."
                                else -> "Pantau keuangan bisnis Anda secara real-time."
                            }
                        }
                        Text(
                            text = "BizGrow AI: $insight",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = BizgrowColors.PrimaryDark,
                            lineHeight = 16.sp
                        )
                    }
                }
            }

            // Hero Finance Card
            item { 
                Box(modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)) {
                    DashboardHeroCard(financeData, viewModel) 
                }
            }

            // KPI Grid
            item {
                Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)) {
                    Text("Hari Ini", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BizgrowColors.Gray950)
                    Spacer(Modifier.height(12.dp))
                    val trxs = financeData?.transactions ?: emptyList()
                    val totalOrders = trxs.count()
                    val totalPelanggan = (financeData?.kpi?.current?.toInt() ?: 0)
                    val alertReceivables = financeData?.alerts?.receivables ?: 0
                    val alertPayables = financeData?.alerts?.payables ?: 0
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KpiBox(icon = Icons.Default.ShoppingCart, title = "$totalOrders", subtitle = "Transaksi", color = BizgrowColors.Primary, modifier = Modifier.weight(1f))
                        KpiBox(icon = Icons.Default.People, title = "${financeData?.biMetrics?.cashRunway?.toInt() ?: 0}", subtitle = "Pelanggan Aktif", color = BizgrowColors.Success, modifier = Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KpiBox(icon = Icons.Default.Inventory2, title = "$alertReceivables", subtitle = "Piutang Jatuh Tempo", color = BizgrowColors.Warning, modifier = Modifier.weight(1f))
                        KpiBox(icon = Icons.Default.Payment, title = "$alertPayables", subtitle = "Hutang Belum Bayar", color = BizgrowColors.Danger, modifier = Modifier.weight(1f))
                    }
                }
            }

            // Cash flow chart
            item { 
                Box(modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)) {
                    FinanceChart(financeData) 
                }
            }

            // Quick Actions
            item {
                Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)) {
                    Text("Quick Action", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BizgrowColors.Gray950)
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        QuickActionCircle(Icons.Default.AddShoppingCart, "Transaksi", BizgrowColors.Primary) { viewModel.navigate(Screen.Pos) }
                        QuickActionCircle(Icons.Default.AddBox, "Produk", BizgrowColors.Success) { viewModel.navigate(Screen.Products) }
                        QuickActionCircle(Icons.Default.PersonAdd, "Pelanggan", BizgrowColors.Warning) { viewModel.navigate(Screen.CrmContacts) }
                        QuickActionCircle(Icons.Default.Receipt, "Invoice", BizgrowColors.Secondary) { viewModel.navigate(Screen.Piutang) }
                    }
                }
            }

            // Alerts
            item {
                Box(modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)) {
                    AlertsSection(financeData = financeData, lowStockProducts = lowStockProducts, viewModel = viewModel)
                }
            }
            
            // Recent transactions
            item {
                Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Aktivitas Terbaru", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BizgrowColors.Gray950)
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
            financeData?.transactions?.take(5)?.let { transactions ->
                if (transactions.isEmpty()) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), contentAlignment = Alignment.Center) {
                            Text("Belum ada aktivitas", color = BizgrowColors.Gray500, fontSize = 13.sp)
                        }
                    }
                } else {
                    items(transactions) { trx -> 
                        Box(modifier = Modifier.padding(horizontal = 24.dp)) {
                            TransactionItem(trx) 
                        }
                    }
                }
            }
            
            // BI Metrics
            financeData?.biMetrics?.let { metrics ->
                item { 
                    Box(modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)) {
                        BiMetricsSection(metrics) 
                    }
                }
            }
        }
    }
}

@Composable
fun KpiBox(icon: ImageVector, title: String, subtitle: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Icon(icon, null, tint = color, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(title, fontWeight = FontWeight.Black, fontSize = 20.sp, color = BizgrowColors.Gray950)
            Text(subtitle, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = BizgrowColors.Gray500)
        }
    }
}

@Composable
fun QuickActionCircle(icon: ImageVector, label: String, color: Color, onClick: () -> Unit = {}) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .background(color.copy(alpha = 0.1f), CircleShape)
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(24.dp))
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(label, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = BizgrowColors.Gray900)
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
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Saldo Bersih", fontSize = 13.sp, color = BizgrowColors.Gray500, fontWeight = FontWeight.Medium)
                val kpiTarget = financeData?.kpi?.target ?: 0.0
                val kpiCurrent = financeData?.kpi?.current ?: 0.0
                if (kpiTarget > 0) {
                    val pct = (kpiCurrent / kpiTarget * 100).toInt()
                    val isPositive = kpiCurrent >= 0
                    Surface(color = if (isPositive) BizgrowColors.SuccessLight else BizgrowColors.DangerLight, shape = RoundedCornerShape(10.dp)) {
                        Text(
                            "${if (isPositive) "↑" else "↓"} $pct%",
                            color = if (isPositive) BizgrowColors.Success else BizgrowColors.Danger,
                            fontSize = 11.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
            Text(
                formatCurrency(balance),
                fontSize = 32.sp,
                fontWeight = FontWeight.Black,
                color = BizgrowColors.Gray950
            )
            HorizontalDivider(color = BizgrowColors.Gray100)
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                MiniStatChip("Masuk", formatCurrency(totalIncome), BizgrowColors.Success)
                MiniStatChip("Keluar", formatCurrency(totalExpense), BizgrowColors.Danger)
                MiniStatChip("Transaksi", "${trxs.size}", BizgrowColors.Primary)
            }
        }
    }
}

@Composable
fun MiniStatChip(label: String, value: String, valueColor: Color) {
    Column {
        Text(label, fontSize = 11.sp, color = BizgrowColors.Gray500, fontWeight = FontWeight.Medium)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = valueColor, maxLines = 1)
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
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("Cash Flow", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = BizgrowColors.Gray950)
                    Text("7 Hari Terakhir", fontSize = 11.sp, color = BizgrowColors.Gray500, fontWeight = FontWeight.Medium)
                }
                Text(totalStr, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = BizgrowColors.Primary)
            }
            Spacer(Modifier.height(20.dp))
            Canvas(modifier = Modifier.fillMaxWidth().height(100.dp)) {
                val w = size.width; val h = size.height
                val count = dataPoints.size
                if (count < 2) {
                    drawLine(BizgrowColors.Primary.copy(alpha = 0.3f), Offset(0f, h * 0.5f), Offset(w, h * 0.5f), strokeWidth = 2.dp.toPx())
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
                    drawPath(fillPath, Brush.verticalGradient(listOf(BizgrowColors.Primary.copy(alpha = 0.15f), Color.Transparent), 0f, h))
                    drawPath(linePath, Brush.linearGradient(listOf(BizgrowColors.Primary, BizgrowColors.PrimaryMid)),
                        style = Stroke(3.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
                    pts.forEach {
                        drawCircle(Color.White, 4.dp.toPx(), it)
                        drawCircle(BizgrowColors.Primary, 2.5.dp.toPx(), it)
                    }
                }
            }
        }
    }
}

// ─── BI Metrics ───────────────────────────────────────────────────────────────
@Composable
fun BiMetricsSection(metrics: BiMetrics) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Business Insights", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BizgrowColors.Gray950)
            Surface(color = BizgrowColors.PrimaryLight, shape = RoundedCornerShape(12.dp)) {
                Text(metrics.outlook, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BizgrowColors.Primary)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            BiMetricCard("Laba Bersih", formatCurrency(metrics.netProfit), Icons.Default.TrendingUp, BizgrowColors.PrimaryLight, BizgrowColors.Primary, Modifier.weight(1f))
            BiMetricCard("Margin", "${metrics.margin}%", Icons.Default.PieChart, BizgrowColors.SuccessLight, BizgrowColors.Success, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            BiMetricCard("Customer", "${metrics.cashRunway}", Icons.Default.People, BizgrowColors.WarningLight, BizgrowColors.Warning, Modifier.weight(1f))
            BiMetricCard("Health Score", "${metrics.integrityScore}", Icons.Default.Favorite, BizgrowColors.Gray100, BizgrowColors.Gray700, Modifier.weight(1f))
        }
    }
}

@Composable
fun BiMetricCard(title: String, value: String, icon: ImageVector, bgColor: Color, iconColor: Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier.height(90.dp), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = BizgrowColors.White), elevation = CardDefaults.cardElevation(2.dp)) {
        Column(Modifier.fillMaxSize().padding(14.dp), verticalArrangement = Arrangement.Center) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(icon, null, Modifier.size(14.dp), tint = iconColor)
                Text(title, fontSize = 11.sp, color = BizgrowColors.Gray500, fontWeight = FontWeight.Medium)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(value, fontSize = 17.sp, fontWeight = FontWeight.Black, color = BizgrowColors.Gray950, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
@Composable
fun AlertsSection(financeData: FinanceData?, lowStockProducts: List<com.upstyle.bizgrow.data.LowStockProduct>, viewModel: AppViewModel) {
    val alerts = buildList {
        if ((financeData?.alerts?.receivables ?: 0) > 0)
            add(Triple("${financeData?.alerts?.receivables} Invoice Jatuh Tempo", BizgrowColors.Warning, Screen.Piutang))
        if ((financeData?.alerts?.payables ?: 0) > 0)
            add(Triple("${financeData?.alerts?.payables} Hutang Belum Dibayar", BizgrowColors.Danger, Screen.Hutang))
        if (lowStockProducts.isNotEmpty())
            add(Triple("${lowStockProducts.size} Produk Hampir Habis", BizgrowColors.Warning, Screen.Products))
    }
    if (alerts.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Perlu Perhatian", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BizgrowColors.Gray950)
        alerts.forEach { (msg, color, screen) ->
            Card(
                modifier = Modifier.fillMaxWidth().clickable { viewModel.navigate(screen) },
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f)),
                elevation = CardDefaults.cardElevation(0.dp)
            ) {
                Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Warning, null, Modifier.size(20.dp), tint = color)
                    Spacer(Modifier.width(12.dp))
                    Text(msg, color = color, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

// ─── Transaction Item ─────────────────────────────────────────────────────────
@Composable
fun TransactionItem(trx: com.upstyle.bizgrow.data.Transaction) {
    val isMasuk = trx.kategoriTrx.equals("PEMASUKAN", ignoreCase = true) || trx.kategoriTrx.equals("MASUK", ignoreCase = true)
    val color = if (isMasuk) BizgrowColors.Success else BizgrowColors.Danger

    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier.size(44.dp).clip(RoundedCornerShape(20.dp)).background(color.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                if (isMasuk) Icons.Default.Check else Icons.Default.Remove,
                null, Modifier.size(20.dp), tint = color
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(trx.keterangan, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = BizgrowColors.Gray950, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                trx.tanggal.take(10).ifEmpty { "-" },
                fontSize = 11.sp, color = BizgrowColors.Gray500
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(
                "${if (isMasuk) "+" else "-"}${formatCurrency(trx.nominal)}",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = color
            )
        }
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
fun formatCurrency(amount: Double): String = "Rp ${"%,.0f".format(amount)}"

