package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.PieChart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NeracaScreen(viewModel: AppViewModel) {
    var expanded by remember { mutableStateOf(false) }
    var selectedPeriod by remember { mutableStateOf("Bulan Ini (Agustus 2026)") }

    val periods = listOf(
        "Bulan Ini (Agustus 2026)",
        "Bulan Lalu (Juli 2026)",
        "Kuartal III 2026",
        "Tahun Ini (2026)",
        "Tahun 2025"
    )

    // Dynamic mock data multipliers based on period selection
    val periodMultiplier = when (selectedPeriod) {
        "Bulan Lalu (Juli 2026)" -> 0.95
        "Kuartal III 2026" -> 1.10
        "Tahun Ini (2026)" -> 1.25
        "Tahun 2025" -> 0.80
        else -> 1.0 // Bulan Ini
    }

    fun scaleAmount(base: Long): Long = (base * periodMultiplier).toLong()

    // Section 1: Aset Lancar
    val asetLancarItems = listOf(
        NeracaItem("Kas & Rekening Bank", scaleAmount(125_400_000L)),
        NeracaItem("Piutang Usaha", scaleAmount(45_250_000L)),
        NeracaItem("Persediaan Barang Dagangan", scaleAmount(88_000_000L)),
        NeracaItem("Biaya Dibayar Dimuka", scaleAmount(12_000_000L))
    )
    val totalAsetLancar = asetLancarItems.sumOf { it.amount }

    // Section 2: Aset Tetap
    val asetTetapItems = listOf(
        NeracaItem("Peralatan & Inventaris Kantor", scaleAmount(65_000_000L)),
        NeracaItem("Kendaraan Operasional", scaleAmount(120_000_000L)),
        NeracaItem("Bangunan & Gedung", scaleAmount(350_000_000L)),
        NeracaItem("Akumulasi Penyusutan Aset Tetap", scaleAmount(45_000_000L), isNegative = true)
    )
    val totalAsetTetap = asetTetapItems.sumOf { if (it.isNegative) -it.amount else it.amount }

    val totalAset = totalAsetLancar + totalAsetTetap

    // Section 3: Kewajiban (Liabilities)
    val kewajibanItems = listOf(
        NeracaItem("Hutang Usaha", scaleAmount(34_500_000L)),
        NeracaItem("Hutang Gaji & Beban Operasional", scaleAmount(15_150_000L)),
        NeracaItem("Hutang Bank (Jangka Panjang)", scaleAmount(150_000_000L))
    )
    val totalKewajiban = kewajibanItems.sumOf { it.amount }

    // Section 4: Ekuitas (Equity)
    val ekuitasItems = listOf(
        NeracaItem("Modal Disetor", scaleAmount(400_000_000L)),
        NeracaItem("Laba Ditahan", scaleAmount(115_000_000L)),
        NeracaItem("Laba Periode Berjalan", scaleAmount(46_000_000L))
    )
    val totalEkuitas = ekuitasItems.sumOf { it.amount }

    val totalKewajibanDanEkuitas = totalKewajiban + totalEkuitas
    val isBalanced = totalAset == totalKewajibanDanEkuitas

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Laporan Neraca",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = "Balance Sheet Statement",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Period Selection Dropdown Box
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = !expanded }
            ) {
                OutlinedTextField(
                    value = selectedPeriod,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Periode Neraca") },
                    leadingIcon = {
                        Icon(
                            Icons.Default.DateRange,
                            contentDescription = null,
                            tint = BizgrowColors.Primary
                        )
                    },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier
                        .menuAnchor()
                        .fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surface
                    )
                )
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    periods.forEach { period ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    period,
                                    fontWeight = if (period == selectedPeriod) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            onClick = {
                                selectedPeriod = period
                                expanded = false
                            }
                        )
                    }
                }
            }

            // Summary Header Card (Balanced Status & Grand Totals)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(6.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(0.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(
                                listOf(BizgrowColors.PrimaryDarker, BizgrowColors.Primary)
                            )
                        )
                        .padding(20.dp)
                ) {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(Color.White.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.AccountBalance,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "RINGKASAN NERACA",
                                    color = Color.White.copy(alpha = 0.85f),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp
                                )
                            }

                            // Balanced Badge
                            Surface(
                                shape = RoundedCornerShape(50.dp),
                                color = if (isBalanced) BizgrowColors.Success.copy(alpha = 0.25f) else BizgrowColors.Danger.copy(alpha = 0.25f),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (isBalanced) BizgrowColors.Success else BizgrowColors.Danger
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = if (isBalanced) BizgrowColors.SuccessLight else BizgrowColors.DangerLight,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = if (isBalanced) "SEIMBANG" else "TIDAK SEIMBANG",
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(18.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Total Aset",
                                    color = Color.White.copy(alpha = 0.75f),
                                    fontSize = 12.sp
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = formatRupiah(totalAset),
                                    color = Color.White,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .width(1.dp)
                                    .height(40.dp)
                                    .background(Color.White.copy(alpha = 0.2f))
                            )

                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(start = 16.dp)
                            ) {
                                Text(
                                    text = "Kewajiban + Ekuitas",
                                    color = Color.White.copy(alpha = 0.75f),
                                    fontSize = 12.sp
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = formatRupiah(totalKewajibanDanEkuitas),
                                    color = Color.White,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }
                        }
                    }
                }
            }

            // Section Header: AKTIVA / ASET
            SectionTitle(title = "AKTIVA (ASET)", icon = Icons.Default.AccountBalanceWallet, color = BizgrowColors.Primary)

            // Card 1: Aset Lancar
            NeracaSectionCard(
                title = "Aset Lancar",
                subtitle = "Current Assets",
                badgeColor = BizgrowColors.PrimaryLight,
                textColor = BizgrowColors.PrimaryDark,
                items = asetLancarItems,
                totalLabel = "Total Aset Lancar",
                totalAmount = totalAsetLancar
            )

            // Card 2: Aset Tetap
            NeracaSectionCard(
                title = "Aset Tetap",
                subtitle = "Fixed Assets",
                badgeColor = BizgrowColors.SecondaryContainer,
                textColor = BizgrowColors.SecondaryDark,
                items = asetTetapItems,
                totalLabel = "Total Aset Tetap",
                totalAmount = totalAsetTetap
            )

            // Card Total Aset Summary
            TotalHighlightCard(
                title = "TOTAL ASET",
                amount = totalAset,
                gradient = BizgrowColors.GradPrimary
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Section Header: PASIVA (KEWAJIBAN & EKUITAS)
            SectionTitle(title = "PASIVA (KEWAJIBAN & EKUITAS)", icon = Icons.Default.PieChart, color = BizgrowColors.SecondaryDark)

            // Card 3: Kewajiban
            NeracaSectionCard(
                title = "Kewajiban",
                subtitle = "Liabilities",
                badgeColor = BizgrowColors.WarningLight,
                textColor = BizgrowColors.WarningDark,
                items = kewajibanItems,
                totalLabel = "Total Kewajiban",
                totalAmount = totalKewajiban
            )

            // Card 4: Ekuitas
            NeracaSectionCard(
                title = "Ekuitas",
                subtitle = "Equity",
                badgeColor = BizgrowColors.SecondaryContainer,
                textColor = BizgrowColors.SecondaryDark,
                items = ekuitasItems,
                totalLabel = "Total Ekuitas",
                totalAmount = totalEkuitas
            )

            // Card Total Kewajiban + Ekuitas Summary
            TotalHighlightCard(
                title = "TOTAL KEWAJIBAN + EKUITAS",
                amount = totalKewajibanDanEkuitas,
                gradient = BizgrowColors.GradEmerald
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun SectionTitle(title: String, icon: ImageVector, color: Color) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = color,
            letterSpacing = 0.5.sp
        )
    }
}

@Composable
private fun NeracaSectionCard(
    title: String,
    subtitle: String,
    badgeColor: Color,
    textColor: Color,
    items: List<NeracaItem>,
    totalLabel: String,
    totalAmount: Long
) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Card Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = badgeColor
                ) {
                    Text(
                        text = "${items.size} akun",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = textColor,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(8.dp))

            // Items List
            items.forEach { item ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = item.name,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f)
                    )

                    val amountText = if (item.isNegative) "(${formatRupiah(item.amount)})" else formatRupiah(item.amount)
                    val amountColor = if (item.isNegative) BizgrowColors.Danger else MaterialTheme.colorScheme.onSurface

                    Text(
                        text = amountText,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = amountColor
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(10.dp))

            // Subtotal Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = totalLabel,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = formatRupiah(totalAmount),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = BizgrowColors.Primary
                )
            }
        }
    }
}

@Composable
private fun TotalHighlightCard(
    title: String,
    amount: Long,
    gradient: List<Color>
) {
    Card(
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(4.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.linearGradient(gradient))
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = formatRupiah(amount),
                    color = Color.White,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }
    }
}

private data class NeracaItem(
    val name: String,
    val amount: Long,
    val isNegative: Boolean = false
)

private fun formatRupiah(amount: Long): String {
    val isNeg = amount < 0
    val absVal = if (isNeg) -amount else amount
    val str = absVal.toString()
    val sb = StringBuilder()
    var count = 0
    for (i in str.length - 1 downTo 0) {
        sb.append(str[i])
        count++
        if (count % 3 == 0 && i > 0) {
            sb.append('.')
        }
    }
    val formatted = sb.reverse().toString()
    return if (isNeg) "-Rp $formatted" else "Rp $formatted"
}
