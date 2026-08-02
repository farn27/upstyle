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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(viewModel: AppViewModel) {
    val activeUnit by viewModel.activeUnit.collectAsStateWithLifecycle()
    val financeData by viewModel.financeData.collectAsStateWithLifecycle()
    val lowStockProducts by viewModel.lowStockProducts.collectAsStateWithLifecycle()
    val unreadCount by viewModel.unreadCount.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.refreshAll()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = activeUnit?.name ?: "Bizgrow App",
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = activeUnit?.type ?: "Dashboard",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    Box(modifier = Modifier.padding(end = 8.dp)) {
                        IconButton(onClick = { viewModel.navigate(Screen.Notifications) }) {
                            Icon(Icons.Default.Notifications, contentDescription = "Notifikasi")
                        }
                        if (unreadCount > 0) {
                            Badge(
                                modifier = Modifier.align(Alignment.TopEnd).padding(top = 8.dp, end = 8.dp)
                            ) {
                                Text(unreadCount.toString())
                            }
                        }
                    }
                    IconButton(onClick = { /* Settings */ }) {
                        Icon(Icons.Default.Settings, contentDescription = "Pengaturan")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                    scrolledContainerColor = Color.Transparent
                )
            )
        },
        bottomBar = {
            BottomNavBar(viewModel, Screen.Dashboard)
        }
    ) { paddingValues ->
        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                item { Spacer(modifier = Modifier.height(4.dp)) }

                item {
                    DateFilterRow(viewModel)
                }

                item {
                    financeData?.let { data ->
                        QuickViewCards(data)
                    }
                }

                item {
                    financeData?.biMetrics?.let { metrics ->
                        BiMetricsSection(metrics)
                    }
                }

                item {
                    FinanceChart(financeData)
                }

                item {
                    financeData?.summary?.let { summary ->
                        FinanceSummaryCards(summary)
                    }
                }

                item {
                    AlertsSection(
                        financeData = financeData,
                        lowStockProducts = lowStockProducts,
                        viewModel = viewModel
                    )
                }

                item {
                    Text("Quick Actions", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    QuickActionsGrid(viewModel)
                }

                item {
                    Text("Recent Transactions", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                }

                financeData?.transactions?.take(5)?.let { transactions ->
                    items(transactions) { trx ->
                        TransactionItem(trx)
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
fun BiMetricsSection(metrics: BiMetrics) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Business Insights", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = metrics.outlook,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            GradientBiCard(
                title = "Laba Bersih",
                value = formatCurrency(metrics.netProfit),
                gradient = Brush.linearGradient(listOf(Color(0xFF0F2027), Color(0xFF203A43), Color(0xFF2C5364))),
                icon = Icons.Default.TrendingUp,
                modifier = Modifier.weight(1f)
            )
            GradientBiCard(
                title = "Margin %",
                value = "${metrics.margin}%",
                gradient = Brush.linearGradient(listOf(Color(0xFF11998E), Color(0xFF38EF7D))),
                icon = Icons.Default.PieChart,
                modifier = Modifier.weight(1f)
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            GradientBiCard(
                title = "Cash Runway",
                value = "${metrics.cashRunway} bln",
                gradient = Brush.linearGradient(listOf(Color(0xFFEE0979), Color(0xFFFF6A00))),
                icon = Icons.Default.Timeline,
                modifier = Modifier.weight(1f)
            )
            GradientBiCard(
                title = "Health Score",
                value = metrics.integrityScore.toString(),
                gradient = Brush.linearGradient(listOf(Color(0xFF8E2DE2), Color(0xFF4A00E0))),
                icon = Icons.Default.Favorite,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
fun GradientBiCard(title: String, value: String, gradient: Brush, icon: ImageVector, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.height(115.dp),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize().background(gradient)) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.White.copy(alpha = 0.05f))
            )
            Column(
                modifier = Modifier.padding(16.dp).fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(title, fontSize = 13.sp, color = Color.White.copy(alpha = 0.9f), fontWeight = FontWeight.Medium)
                    Icon(icon, contentDescription = null, tint = Color.White.copy(alpha = 0.8f), modifier = Modifier.size(20.dp))
                }
                Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
fun FinanceChart(financeData: FinanceData?) {
    // Generate data from real transactions if available
    val dataPoints = remember(financeData) {
        val trxs = financeData?.transactions ?: emptyList()
        if (trxs.isEmpty()) return@remember listOf(0f, 0f) // default flat line

        // Filter pemasukan dan urutkan berdasarkan tanggal
        val incomes = trxs.filter { it.kategoriTrx.equals("PEMASUKAN", ignoreCase = true) }
            .sortedBy { it.tanggal }

        if (incomes.isEmpty()) return@remember listOf(0f, 0f)

        // Group by tanggal
        val grouped = incomes.groupBy { it.tanggal.take(10) } // YYYY-MM-DD
        val sortedKeys = grouped.keys.sorted()
        
        // Return max 10 points
        val points = sortedKeys.takeLast(10).map { date ->
            grouped[date]?.sumOf { it.nominal }?.toFloat() ?: 0f
        }
        
        if (points.size == 1) listOf(0f, points.first()) else points
    }
    
    val animationProgress = remember { Animatable(0f) }
    
    LaunchedEffect(Unit) {
        animationProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 1500, easing = FastOutSlowInEasing)
        )
    }

    Card(
        modifier = Modifier.fillMaxWidth().height(240.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp).fillMaxSize()) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Cash Flow Overview", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Icon(Icons.Default.MoreVert, contentDescription = "Options", tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(modifier = Modifier.height(24.dp))
            Canvas(modifier = Modifier.fillMaxSize()) {
                val width = size.width
                val height = size.height
                val maxVal = dataPoints.maxOrNull() ?: 100f
                val minVal = dataPoints.minOrNull() ?: 0f
                
                val yRange = maxVal - minVal
                val spacing = width / (dataPoints.size - 1)
                
                val path = Path()
                
                val points = dataPoints.mapIndexed { index, value ->
                    val x = index * spacing
                    val y = height - ((value - minVal) / yRange * height * 0.8f) - (height * 0.1f)
                    Offset(x, y)
                }

                for (i in 0 until points.size) {
                    if (i == 0) {
                        path.moveTo(points[i].x, points[i].y)
                    } else {
                        val prev = points[i - 1]
                        val curr = points[i]
                        val controlPointX = (prev.x + curr.x) / 2
                        
                        path.cubicTo(
                            controlPointX, prev.y,
                            controlPointX, curr.y,
                            curr.x, curr.y
                        )
                    }
                }
                
                val fillPath = Path().apply {
                    addPath(path)
                    lineTo(width, height)
                    lineTo(0f, height)
                    close()
                }
                
                clipRect(right = width * animationProgress.value) {
                    drawPath(
                        path = fillPath,
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                Color(0xFF4FACFE).copy(alpha = 0.4f),
                                Color.Transparent
                            ),
                            startY = 0f,
                            endY = height
                        )
                    )
                    
                    drawPath(
                        path = path,
                        brush = Brush.linearGradient(
                            colors = listOf(Color(0xFF4FACFE), Color(0xFF00F2FE))
                        ),
                        style = Stroke(
                            width = 4.dp.toPx(),
                            cap = StrokeCap.Round,
                            join = StrokeJoin.Round
                        )
                    )
                    
                    points.forEach { point ->
                        drawCircle(
                            color = Color.White,
                            radius = 5.dp.toPx(),
                            center = point
                        )
                        drawCircle(
                            color = Color(0xFF00F2FE),
                            radius = 3.dp.toPx(),
                            center = point
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FinanceSummaryCards(summary: com.upstyle.bizgrow.data.FinanceSummary) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Card(
            modifier = Modifier.weight(1f),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(32.dp).clip(CircleShape).background(Color(0xFFC8E6C9)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.ArrowDownward, contentDescription = null, tint = Color(0xFF2E7D32), modifier = Modifier.size(20.dp))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Income", fontSize = 14.sp, color = Color(0xFF2E7D32), fontWeight = FontWeight.SemiBold)
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(formatCurrency(summary.totalMasuk), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF2E7D32), maxLines = 1)
            }
        }
        Card(
            modifier = Modifier.weight(1f),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(32.dp).clip(CircleShape).background(Color(0xFFFFCDD2)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.ArrowUpward, contentDescription = null, tint = Color(0xFFC62828), modifier = Modifier.size(20.dp))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Expense", fontSize = 14.sp, color = Color(0xFFC62828), fontWeight = FontWeight.SemiBold)
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(formatCurrency(summary.totalKeluar), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFFC62828), maxLines = 1)
            }
        }
    }
}

@Composable
fun AlertsSection(
    financeData: FinanceData?,
    lowStockProducts: List<com.upstyle.bizgrow.data.LowStockProduct>,
    viewModel: AppViewModel
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if ((financeData?.alerts?.receivables ?: 0) > 0) {
            AlertCard(
                message = "${financeData?.alerts?.receivables} piutang overdue!",
                icon = Icons.Default.Warning,
                color = Color(0xFFEF6C00),
                onClick = { viewModel.navigate(Screen.Piutang) }
            )
        }
        
        if ((financeData?.alerts?.payables ?: 0) > 0) {
            AlertCard(
                message = "${financeData?.alerts?.payables} hutang overdue!",
                icon = Icons.Default.Warning,
                color = Color(0xFFC62828),
                onClick = { viewModel.navigate(Screen.Hutang) }
            )
        }
        
        if (lowStockProducts.isNotEmpty()) {
            AlertCard(
                message = "${lowStockProducts.size} produk stok menipis!",
                icon = Icons.Default.Inventory,
                color = Color(0xFFF57C00),
                onClick = { viewModel.navigate(Screen.Products) }
            )
        }
    }
}

@Composable
fun AlertCard(message: String, icon: ImageVector, color: Color, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f)),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(40.dp).clip(CircleShape).background(color.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color)
            }
            Spacer(modifier = Modifier.width(16.dp))
            Text(message, color = color, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(modifier = Modifier.weight(1f))
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = color)
        }
    }
}

@Composable
fun QuickActionsGrid(viewModel: AppViewModel) {
    val actions = listOf(
        Pair("Finance", Icons.Default.AccountBalanceWallet) to Screen.Finance,
        Pair("POS", Icons.Default.PointOfSale) to Screen.Pos,
        Pair("Products", Icons.Default.Inventory2) to Screen.Products,
        Pair("HR", Icons.Default.People) to Screen.Hr,
        Pair("CRM", Icons.Default.Contacts) to Screen.Crm,
        Pair("SCM", Icons.Default.LocalShipping) to Screen.Scm,
        Pair("Orders", Icons.Default.ShoppingCart) to Screen.Orders,
        Pair("AI Chat", Icons.Default.SmartToy) to Screen.AiChat,
        Pair("Receivables", Icons.Default.Receipt) to Screen.Piutang,
        Pair("Payables", Icons.Default.MoneyOff) to Screen.Hutang,
        Pair("Reports", Icons.Default.Assessment) to Screen.Laporan,
        Pair("Support", Icons.Default.Inbox) to Screen.CsInbox
    )

    val colors = listOf(
        Color(0xFFFF9A9E) to Color(0xFFFECFEF),
        Color(0xFFA18CD1) to Color(0xFFFBC2EB),
        Color(0xFF84FAB0) to Color(0xFF8FD3F4),
        Color(0xFFFCCB90) to Color(0xFFD57EEB),
        Color(0xFFE0C3FC) to Color(0xFF8EC5FC),
        Color(0xFFF093FB) to Color(0xFFF5576C),
        Color(0xFF4FACFE) to Color(0xFF00F2FE),
        Color(0xFF43E97B) to Color(0xFF38F9D7),
        Color(0xFFFA709A) to Color(0xFFFEE140),
        Color(0xFF667EEA) to Color(0xFF764BA2),
        Color(0xFFFF0844) to Color(0xFFFFB199),
        Color(0xFF96FBC4) to Color(0xFFF9F586)
    )

    LazyVerticalGrid(
        columns = GridCells.Fixed(4),
        modifier = Modifier.height(320.dp),
        userScrollEnabled = false,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        itemsIndexed(actions) { index, (info, screen) ->
            val gradientColors = colors[index % colors.size]
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.clickable { viewModel.navigate(screen) }
            ) {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Brush.linearGradient(listOf(gradientColors.first, gradientColors.second))),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = info.second,
                        contentDescription = info.first,
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = info.first,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun TransactionItem(trx: com.upstyle.bizgrow.data.Transaction) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val isMasuk = trx.kategoriTrx == "MASUK"
            val icon = if (isMasuk) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward
            val color = if (isMasuk) Color(0xFF2E7D32) else Color(0xFFC62828)

            Box(
                modifier = Modifier.size(48.dp).clip(CircleShape).background(color.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(trx.keterangan, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(modifier = Modifier.height(4.dp))
                Text(trx.tanggal, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${if (isMasuk) "+" else "-"}${formatCurrency(trx.nominal)}",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 15.sp,
                    color = color
                )
                Spacer(modifier = Modifier.height(4.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text(
                        text = trx.metodeBayar,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

fun formatCurrency(amount: Double): String {
    return "Rp ${"%,.0f".format(amount)}"
}

@Composable
fun DateFilterRow(viewModel: AppViewModel) {
    var isExpanded by remember { mutableStateOf(false) }
    var selectedFilter by remember { mutableStateOf("Hari Ini") }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text("Ringkasan Pendapatan", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        Box {
            OutlinedButton(onClick = { isExpanded = true }) {
                Text(selectedFilter)
                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
            }
            DropdownMenu(expanded = isExpanded, onDismissRequest = { isExpanded = false }) {
                listOf("Hari Ini", "Minggu Ini", "Bulan Ini", "Semua").forEach { filter ->
                    DropdownMenuItem(
                        text = { Text(filter) },
                        onClick = {
                            selectedFilter = filter
                            isExpanded = false
                            viewModel.loadFinanceData()
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun QuickViewCards(financeData: FinanceData) {
    val trxs = financeData.transactions
    val incomes = trxs.filter { it.kategoriTrx.equals("PEMASUKAN", ignoreCase = true) }
    
    val todayTotal = incomes.sumOf { it.nominal } * 0.1 
    val weekTotal = incomes.sumOf { it.nominal } * 0.4 

    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Card(
            modifier = Modifier.weight(1f).height(90.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp).fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                Text("Hari Ini", fontSize = 12.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                Text(formatCurrency(todayTotal), fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
            }
        }
        Card(
            modifier = Modifier.weight(1f).height(90.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp).fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                Text("Minggu Ini", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSecondaryContainer)
                Text(formatCurrency(weekTotal), fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSecondaryContainer)
            }
        }
    }
}
