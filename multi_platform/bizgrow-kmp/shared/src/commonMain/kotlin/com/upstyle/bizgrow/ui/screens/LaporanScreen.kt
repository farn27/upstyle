package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel
import kotlinx.datetime.*

import kotlinx.datetime.Clock
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.minus
import kotlinx.datetime.todayIn

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LaporanScreen(viewModel: AppViewModel) {
    val labaRugiData by viewModel.labaRugiData.collectAsState()
    val arusKasData by viewModel.arusKasData.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Laba Rugi", "Arus Kas")

    var expanded by remember { mutableStateOf(false) }
    var selectedPeriod by remember { mutableStateOf("Bulan Ini") }
    val periods = listOf("Bulan Ini", "Bulan Lalu", "Tahun Ini")

    fun getDateRange(period: String): Pair<String, String> {
        val now = Clock.System.now().toLocalDateTime(TimeZone.of("Asia/Jakarta")).date
        return when (period) {
            "Bulan Lalu" -> {
                val lastMonth = if (now.monthNumber == 1) {
                    LocalDate(now.year - 1, 12, 1)
                } else {
                    LocalDate(now.year, now.monthNumber - 1, 1)
                }
                val lastDayOfLastMonth = lastMonth.plus(DatePeriod(months = 1)).minus(DatePeriod(days = 1))
                Pair(lastMonth.toString(), lastDayOfLastMonth.toString())
            }
            "Tahun Ini" -> Pair("${now.year}-01-01", "${now.year}-12-31")
            else -> { // Bulan Ini
                val firstDay = LocalDate(now.year, now.monthNumber, 1)
                val lastDay = firstDay.plus(DatePeriod(months = 1)).minus(DatePeriod(days = 1))
                Pair(firstDay.toString(), lastDay.toString())
            }
        }
    }

    LaunchedEffect(selectedPeriod, selectedTab) {
        val (start, end) = getDateRange(selectedPeriod)
        if (selectedTab == 0) viewModel.loadLabaRugi(start, end)
        else viewModel.loadArusKas(start, end)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Laporan Keuangan") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        val (start, end) = getDateRange(selectedPeriod)
                        if (selectedTab == 0) viewModel.loadLabaRugi(start, end)
                        else viewModel.loadArusKas(start, end)
                    }) {
                        Icon(Icons.Default.Refresh, null)
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(modifier = Modifier.padding(paddingValues).fillMaxSize()) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) }
                    )
                }
            }

            Column(modifier = Modifier.padding(16.dp).fillMaxSize().verticalScroll(rememberScrollState())) {
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = !expanded }
                ) {
                    OutlinedTextField(
                        value = selectedPeriod,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Periode") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp)
                    )
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        periods.forEach { period ->
                            DropdownMenuItem(
                                text = { Text(period) },
                                onClick = { selectedPeriod = period; expanded = false }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                if (uiState.isLoading && (labaRugiData == null || arusKasData == null)) {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else if (selectedTab == 0) {
                    val data = labaRugiData
                    if (data != null) {
                        MetricCard("Pendapatan", data.pendapatan, Color(0xFF2E7D32))
                        MetricCard("Harga Pokok Penjualan (HPP)", data.hpp, Color(0xFFC62828))
                        MetricCard("Laba Kotor", data.labaKotor, Color(0xFF1565C0))
                        MetricCard("Biaya Operasional", data.biayaOperasional, Color(0xFFC62828))
                        Spacer(modifier = Modifier.height(8.dp))
                        MetricCard("Laba Bersih", data.labaBersih, if (data.labaBersih >= 0) Color(0xFF2E7D32) else Color(0xFFC62828), isTotal = true)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Periode: ${data.periode}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text("Pilih periode untuk melihat laporan", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                } else {
                    val data = arusKasData
                    if (data != null) {
                        MetricCard("Kas Awal", data.kasAwal, Color.Gray)
                        MetricCard("Total Kas Masuk", data.totalMasuk, Color(0xFF2E7D32))
                        MetricCard("Total Kas Keluar", data.totalKeluar, Color(0xFFC62828))
                        Spacer(modifier = Modifier.height(8.dp))
                        MetricCard("Kas Akhir", data.kasAkhir, if (data.kasAkhir >= 0) Color(0xFF1565C0) else Color(0xFFC62828), isTotal = true)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Periode: ${data.periode}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text("Pilih periode untuk melihat laporan", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MetricCard(title: String, amount: Double, color: Color, isTotal: Boolean = false) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isTotal) color.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surfaceVariant
        ),
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(title, fontSize = if (isTotal) 16.sp else 14.sp, fontWeight = if (isTotal) FontWeight.Bold else FontWeight.Normal, modifier = Modifier.weight(1f))
            Text(
                "Rp ${"%,.0f".format(amount)}",
                fontSize = if (isTotal) 18.sp else 16.sp,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}
