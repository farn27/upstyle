package com.example.ui

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun DashboardScreen(
    viewModel: SaaSViewModel,
    modifier: Modifier = Modifier
) {
    val bi by viewModel.biMetrics.collectAsStateWithLifecycle()
    val transactions by viewModel.transactions.collectAsStateWithLifecycle()
    val history by viewModel.riwayatAksi.collectAsStateWithLifecycle()
    val activeUnit by viewModel.activeUnit.collectAsStateWithLifecycle()

    var showAddTxDialog by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero / Welcome Panel
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                ),
                shape = RoundedCornerShape(24.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = activeUnit?.namaUnit ?: "Bizgrow",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = activeUnit?.alamat ?: "Manajemen bisnis dalam satu aplikasi",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Surface(
                        color = MaterialTheme.colorScheme.primary,
                        shape = CircleShape,
                        modifier = Modifier.size(56.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.Storefront,
                                contentDescription = "Store icon",
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }
                }
            }
        }

        // BI Section Title
        item {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Business Intelligence & KPIs",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Surface(
                    color = when (bi.outlook) {
                        "STABLE" -> Color(0xFF2E7D32)
                        "MODERATE" -> Color(0xFFEF6C00)
                        else -> Color(0xFFC62828)
                    }.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = bi.outlook,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = when (bi.outlook) {
                            "STABLE" -> Color(0xFF2E7D32)
                            "MODERATE" -> Color(0xFFEF6C00)
                            else -> Color(0xFFC62828)
                        },
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }

        // BI Grid of Cards
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    BiCard(
                        title = "Laba Bersih (Net)",
                        value = "Rp ${String.format("%,.0f", bi.netProfit)}",
                        icon = Icons.AutoMirrored.Filled.TrendingUp,
                        color = if (bi.netProfit >= 0) Color(0xFF2E7D32) else Color(0xFFC62828),
                        modifier = Modifier.weight(1f)
                    )
                    BiCard(
                        title = "Margin Laba",
                        value = "${String.format("%.1f", bi.margin)}%",
                        icon = Icons.Default.Percent,
                        color = Color(0xFF1565C0),
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    BiCard(
                        title = "Cash Runway",
                        value = "${String.format("%.1f", bi.cashRunway)} Bulan",
                        icon = Icons.Default.HourglassEmpty,
                        color = when (bi.riskAssessment) {
                            "LOW" -> Color(0xFF2E7D32)
                            "MEDIUM" -> Color(0xFFEF6C00)
                            else -> Color(0xFFC62828)
                        },
                        modifier = Modifier.weight(1f)
                    )
                    BiCard(
                        title = "Health Score",
                        value = "${bi.integrityScore}/10",
                        icon = Icons.Default.Favorite,
                        color = Color(0xFFAD1457),
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // BI Misleading Alert
        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "Info",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Formula BI Confidence: ${bi.aiConfidence}% (Berdasarkan volume data transaksi Anda)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Financial Canvas Chart
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Statistik Arus Kas (Keuangan)",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    val masuk = bi.totalMasuk.toFloat()
                    val keluar = bi.totalKeluar.toFloat()
                    val maxVal = (masuk + keluar).coerceAtLeast(100000f)

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val w = size.width
                            val h = size.height

                            val paddingLeft = 40f
                            val chartW = w - paddingLeft
                            val chartH = h - 30f

                            // Draw grid lines
                            drawLine(Color.LightGray.copy(alpha = 0.5f), Offset(paddingLeft, 0f), Offset(w, 0f), strokeWidth = 1f)
                            drawLine(Color.LightGray.copy(alpha = 0.5f), Offset(paddingLeft, chartH / 2), Offset(w, chartH / 2), strokeWidth = 1f)
                            drawLine(Color.LightGray.copy(alpha = 0.5f), Offset(paddingLeft, chartH), Offset(w, chartH), strokeWidth = 2f)

                            // Bar widths
                            val barW = 60f
                            val space = 40f

                            // Draw Income bar (Green)
                            val incH = (masuk / maxVal) * chartH
                            drawRect(
                                color = Color(0xFF4CAF50),
                                topLeft = Offset(paddingLeft + space, chartH - incH),
                                size = androidx.compose.ui.geometry.Size(barW, incH)
                            )

                            // Draw Expense bar (Red)
                            val expH = (keluar / maxVal) * chartH
                            drawRect(
                                color = Color(0xFFF44336),
                                topLeft = Offset(paddingLeft + space * 2 + barW, chartH - expH),
                                size = androidx.compose.ui.geometry.Size(barW, expH)
                            )
                        }

                        // Text labels overlapping Canvas
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .align(Alignment.BottomCenter)
                                .padding(start = 24.dp),
                            horizontalArrangement = Arrangement.spacedBy(40.dp)
                        ) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Masuk", style = MaterialTheme.typography.bodySmall, color = Color(0xFF2E7D32), fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.width(16.dp))
                            Text("Keluar", style = MaterialTheme.typography.bodySmall, color = Color(0xFFC62828), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Section: Enterprise Financial Projection Simulator
        item {
            var growthRate by remember { mutableStateOf(15f) }
            val projectedMasuk = bi.totalMasuk * (1 + growthRate / 100f)
            val projectedProfit = projectedMasuk - bi.totalKeluar
            val projectedRunway = if (bi.totalKeluar > 0) ((activeUnit?.modalAwal ?: 10000000.0) / (bi.totalKeluar / 3.0).coerceAtLeast(100000.0)) * (1 + growthRate / 200f) else 99.0

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                ),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Simulator Proyeksi Laba & Runway",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Simulasi pertumbuhan penjualan untuk perencanaan",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Icon(
                            imageVector = Icons.Default.Timeline,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Target Pertumbuhan:",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Text(
                            text = "+${growthRate.toInt()}%",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Slider(
                        value = growthRate,
                        onValueChange = { growthRate = it },
                        valueRange = 0f..100f,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(10.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text("Proyeksi Pendapatan", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(
                                    "Rp ${String.format("%,.0f", projectedMasuk)}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF2E7D32)
                                )
                            }
                        }

                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(10.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text("Estimasi Runway", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(
                                    "${String.format("%.1f", projectedRunway)} Bulan",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.secondary
                                )
                            }
                        }
                    }

                    Surface(
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lightbulb,
                                contentDescription = "Saran",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = when {
                                    growthRate < 20f -> "Target moderat. Fokus pada efisiensi biaya operasional unit."
                                    growthRate < 50f -> "Target menantang. Optimalkan CRM pipeline dan konversi prospek deal."
                                    else -> "Pertumbuhan agresif. Pertimbangkan penambahan stok inventori di POS."
                                },
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        // Transactions list section
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Riwayat Transaksi",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Button(
                    onClick = { showAddTxDialog = true },
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add transaction", modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Transaksi", style = MaterialTheme.typography.labelMedium)
                }
            }
        }

        if (transactions.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Belum ada transaksi. Silakan tambahkan transaksi masuk atau keluar.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            items(transactions.take(5)) { tx ->
                TransactionRow(tx, onDelete = { viewModel.deleteTransaction(tx.id, tx.unitId) })
            }
        }

        // Audit Trail (Riwayat Aksi)
        item {
            Text(
                text = "Audit Trail (Riwayat Aksi)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        if (history.isEmpty()) {
            item {
                Text(
                    text = "Aksi sistem belum tercatat.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            items(history.take(8)) { log ->
                AuditTrailRow(log)
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }

    if (showAddTxDialog) {
        AddTransactionDialog(
            onDismiss = { showAddTxDialog = false },
            onConfirm = { type, amt, desc ->
                viewModel.addTransaction(type, amt, desc)
                showAddTxDialog = false
            }
        )
    }
}

@Composable
fun BiCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
fun TransactionRow(
    tx: Transaction,
    onDelete: () -> Unit
) {
    val dateStr = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault()).format(Date(tx.tanggal))
    val isMasuk = tx.kategoriTrx == "MASUK"

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Surface(
                    color = if (isMasuk) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                    shape = CircleShape,
                    modifier = Modifier.size(40.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (isMasuk) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                            contentDescription = null,
                            tint = if (isMasuk) Color(0xFF2E7D32) else Color(0xFFC62828),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = tx.keterangan,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = dateStr,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${if (isMasuk) "+" else "-"} Rp ${String.format("%,.0f", tx.nominal)}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isMasuk) Color(0xFF2E7D32) else Color(0xFFC62828)
                )
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color.Gray, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@Composable
fun AuditTrailRow(log: RiwayatAksi) {
    val dateStr = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(log.waktu))
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = when (log.tipe) {
                    "SUCCESS" -> Color(0xFF4CAF50)
                    "WARNING" -> Color(0xFFFF9800)
                    else -> Color(0xFF2196F3)
                },
                shape = CircleShape,
                modifier = Modifier.size(8.dp)
            ) {}
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = log.pesan,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "${log.kategori} • $dateStr",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

// --- Dialogs ---

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionDialog(
    onDismiss: () -> Unit,
    onConfirm: (type: String, amount: Double, desc: String) -> Unit
) {
    var type by remember { mutableStateOf("MASUK") }
    var amount by remember { mutableStateOf("") }
    var desc by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Tambah Transaksi Keuangan",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                // Select Box
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { type = "MASUK" },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (type == "MASUK") Color(0xFF4CAF50) else Color.LightGray.copy(alpha = 0.2f)
                        ),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Pendapatan (In)", color = if (type == "MASUK") Color.White else Color.Black)
                    }
                    Button(
                        onClick = { type = "KELUAR" },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (type == "KELUAR") Color(0xFFF44336) else Color.LightGray.copy(alpha = 0.2f)
                        ),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Pengeluaran (Out)", color = if (type == "KELUAR") Color.White else Color.Black)
                    }
                }

                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text("Nominal (IDR)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = desc,
                    onValueChange = { desc = it },
                    label = { Text("Keterangan") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) { Text("Batal") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val amt = amount.toDoubleOrNull() ?: 0.0
                            if (amt > 0 && desc.isNotEmpty()) {
                                onConfirm(type, amt, desc)
                            }
                        }
                    ) {
                        Text("Simpan")
                    }
                }
            }
        }
    }
}

// ======================== PRODUCT SCREEN ========================

@Composable
fun ProductScreen(
    viewModel: SaaSViewModel,
    modifier: Modifier = Modifier
) {
    val products by viewModel.products.collectAsStateWithLifecycle()
    val stockLogs by viewModel.stockLogs.collectAsStateWithLifecycle()

    var selectedTab by remember { mutableIntStateOf(0) }
    val tabTitles = listOf("Daftar Produk", "Kategori", "Stok Opname")

    var showAddProductDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "BIZGROW CATALOG",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 2.sp
                )
                Text(
                    text = "Katalog & Inventori",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }
            if (selectedTab == 0) {
                Button(
                    onClick = { showAddProductDialog = true },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add product")
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Produk")
                }
            }
        }

        // Tab Row
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color.Transparent,
            contentColor = MaterialTheme.colorScheme.primary,
            divider = {}
        ) {
            tabTitles.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = {
                        Text(
                            text = title,
                            fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                )
            }
        }

        // Content Area
        Box(modifier = Modifier.weight(1f)) {
            when (selectedTab) {
                0 -> ProductListTab(viewModel, products)
                1 -> CategoryListTab(products)
                2 -> StockOpnameTab(stockLogs)
            }
        }
    }

    if (showAddProductDialog) {
        AddProductDialog(
            onDismiss = { showAddProductDialog = false },
            onConfirm = { sku, name, buy, sell, stock, cat ->
                viewModel.addProduct(sku, name, buy, sell, stock, cat)
                showAddProductDialog = false
            }
        )
    }
}

@Composable
fun ProductListTab(
    viewModel: SaaSViewModel,
    products: List<Product>
) {
    var filterLowStockOnly by remember { mutableStateOf(false) }

    val filteredProducts = if (filterLowStockOnly) {
        products.filter { it.stok < 20 }
    } else {
        products
    }

    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // Section: Custom Filter Chips & Actions
        item {
            val lowStockCount = products.count { it.stok < 20 }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Surface(
                        onClick = { filterLowStockOnly = false },
                        color = if (!filterLowStockOnly) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, if (!filterLowStockOnly) Color.Transparent else MaterialTheme.colorScheme.outlineVariant)
                    ) {
                        Text(
                            text = "Semua (${products.size})",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (!filterLowStockOnly) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }

                    Surface(
                        onClick = { filterLowStockOnly = true },
                        color = if (filterLowStockOnly) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, if (filterLowStockOnly) Color.Transparent else MaterialTheme.colorScheme.outlineVariant)
                    ) {
                        Text(
                            text = "Menipis ($lowStockCount)",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (filterLowStockOnly) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }
                }

                if (products.isNotEmpty()) {
                    OutlinedButton(
                        onClick = { viewModel.bulkRestockAll() },
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Autorenew, contentDescription = "Restock", modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Restok (100)", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }

        if (filteredProducts.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (filterLowStockOnly) "Tidak ada produk dengan stok menipis!" else "Katalog produk kosong. Silakan tambahkan produk baru.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            items(filteredProducts) { prod ->
                ProductCardRow(
                    product = prod,
                    onDelete = { viewModel.deleteProduct(prod.id, prod.nama) }
                )
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

@Composable
fun CategoryListTab(products: List<Product>) {
    val categories = products.groupBy { it.kategori.ifEmpty { "UMUM" } }.mapValues { it.value.size }

    if (categories.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Belum ada kategori terdaftar.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    } else {
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(categories.entries.toList()) { entry ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = entry.key,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Kategori Produk",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "${entry.value} Produk",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StockOpnameTab(stockLogs: List<StockLog>) {
    if (stockLogs.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Belum ada riwayat perubahan stok (stok opname).", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    } else {
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(stockLogs) { log ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault()).format(Date(log.tanggal)),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = if (log.perubahan >= 0) Color(0xFFECFDF5) else Color(0xFFFFF1F1)
                                ),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    text = if (log.perubahan >= 0) "+${log.perubahan} QTY" else "${log.perubahan} QTY",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (log.perubahan >= 0) Color(0xFF047857) else Color(0xFFB91C1C),
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Text(
                            text = "Product ID: ${log.productId.take(8).uppercase()}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold
                        )

                        Text(
                            text = "Alasan: ${log.alasan}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Stok Akhir", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                text = "${log.stokAkhir} unit",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProductCardRow(
    product: Product,
    onDelete: () -> Unit
) {
    val isLowStock = product.stok < 20

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Surface(
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = product.sku,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = product.nama,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Kategori: ${product.kategori}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Beli: Rp ${String.format("%,.0f", product.hargaBeli)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.Gray
                    )
                    Text(
                        text = "Jual: Rp ${String.format("%,.0f", product.hargaJual)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.Center
            ) {
                Surface(
                    color = if (isLowStock) Color(0xFFFFF3E0) else Color(0xFFE8F5E9),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "Stok: ${product.stok}",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = if (isLowStock) Color(0xFFE65100) else Color(0xFF2E7D32),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color.Gray.copy(alpha = 0.7f))
                }
            }
        }
    }
}

@Composable
fun AddProductDialog(
    onDismiss: () -> Unit,
    onConfirm: (sku: String, name: String, buy: Double, sell: Double, stock: Int, cat: String) -> Unit
) {
    var sku by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var buyPrice by remember { mutableStateOf("") }
    var sellPrice by remember { mutableStateOf("") }
    var stock by remember { mutableStateOf("") }
    var cat by remember { mutableStateOf("Bahan Pokok") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState())
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Tambah Produk Baru",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                OutlinedTextField(
                    value = sku,
                    onValueChange = { sku = it },
                    label = { Text("SKU Produk") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Produk") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = buyPrice,
                    onValueChange = { buyPrice = it },
                    label = { Text("Harga Beli (IDR)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = sellPrice,
                    onValueChange = { sellPrice = it },
                    label = { Text("Harga Jual (IDR)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = stock,
                    onValueChange = { stock = it },
                    label = { Text("Stok") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = cat,
                    onValueChange = { cat = it },
                    label = { Text("Kategori") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) { Text("Batal") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val b = buyPrice.toDoubleOrNull() ?: 0.0
                            val s = sellPrice.toDoubleOrNull() ?: 0.0
                            val st = stock.toIntOrNull() ?: 0
                            if (sku.isNotEmpty() && name.isNotEmpty() && s > 0) {
                                onConfirm(sku, name, b, s, st, cat)
                            }
                        }
                    ) {
                        Text("Simpan")
                    }
                }
            }
        }
    }
}

// ======================== POINT OF SALE (POS) ========================

@Composable
fun PosScreen(
    viewModel: SaaSViewModel,
    modifier: Modifier = Modifier
) {
    val products by viewModel.products.collectAsStateWithLifecycle()
    val cart by viewModel.cart.collectAsStateWithLifecycle()
    val customers by viewModel.posCustomers.collectAsStateWithLifecycle()

    var showCheckoutDialog by remember { mutableStateOf(false) }
    var selectedCustomerId by remember { mutableStateOf<Int?>(null) }
    var showAddCustomerDialog by remember { mutableStateOf(false) }
    var discountPercent by remember { mutableStateOf(0f) }
    var applyPpn by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // POS Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Point of Sale (Kasir)",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Kelola antrean transaksi penjualan kasir",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            IconButton(onClick = { showAddCustomerDialog = true }) {
                Icon(Icons.Default.PersonAdd, contentDescription = "Add Customer")
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Grid Split: Left side products, Right side cart (Or dynamic layout based on space)
        Row(modifier = Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            // Products catalogs list
            Column(modifier = Modifier.weight(1.2f)) {
                Text(
                    text = "Pilih Produk",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                if (products.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Katalog kosong.", style = MaterialTheme.typography.bodyMedium)
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(products) { prod ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { viewModel.addToCart(prod) },
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(prod.nama, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                                        Text("Stok: ${prod.stok} • Rp ${String.format("%,.0f", prod.hargaJual)}", style = MaterialTheme.typography.bodySmall)
                                    }
                                    IconButton(
                                        onClick = { viewModel.addToCart(prod) },
                                        enabled = prod.stok > (cart[prod] ?: 0)
                                    ) {
                                        Icon(Icons.Default.AddShoppingCart, contentDescription = "Add")
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Cart Panel (Right column)
            Card(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "Keranjang Penjualan",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Customer drop-down simulation (simplified)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Customer:", style = MaterialTheme.typography.labelSmall)
                        Spacer(modifier = Modifier.width(4.dp))
                        Box(modifier = Modifier.weight(1f)) {
                            var expanded by remember { mutableStateOf(false) }
                            val currentCustName = customers.find { it.id == selectedCustomerId }?.namaCustomer ?: "Umum/Walk-in"
                            
                            Surface(
                                border = BorderStroke(1.dp, Color.LightGray),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { expanded = true }
                            ) {
                                Text(
                                    currentCustName,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                DropdownMenuItem(
                                    text = { Text("Umum / Walk-in") },
                                    onClick = {
                                        selectedCustomerId = null
                                        expanded = false
                                    }
                                )
                                customers.forEach { cust ->
                                    DropdownMenuItem(
                                        text = { Text(cust.namaCustomer) },
                                        onClick = {
                                            selectedCustomerId = cust.id
                                            expanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Scrollable Cart Items
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(cart.entries.toList()) { (prod, qty) ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(prod.nama, style = MaterialTheme.typography.labelMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text("$qty x Rp ${String.format("%,.0f", prod.hargaJual)}", style = MaterialTheme.typography.labelSmall)
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(onClick = { viewModel.removeFromCart(prod) }, modifier = Modifier.size(24.dp)) {
                                        Icon(Icons.Default.Remove, contentDescription = "Decrease", modifier = Modifier.size(16.dp))
                                    }
                                    Text("$qty", modifier = Modifier.padding(horizontal = 4.dp), style = MaterialTheme.typography.labelMedium)
                                    IconButton(onClick = { viewModel.addToCart(prod) }, modifier = Modifier.size(24.dp)) {
                                        Icon(Icons.Default.Add, contentDescription = "Increase", modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                    val subtotal = cart.entries.sumOf { it.key.hargaJual * it.value }
                    val discountAmount = subtotal * (discountPercent / 100f)
                    val taxableAmount = subtotal - discountAmount
                    val ppnAmount = if (applyPpn) taxableAmount * 0.11 else 0.0
                    val totalAmount = taxableAmount + ppnAmount

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Diskon: ${discountPercent.toInt()}%", style = MaterialTheme.typography.labelSmall)
                            Slider(
                                value = discountPercent,
                                onValueChange = { discountPercent = it },
                                valueRange = 0f..50f,
                                modifier = Modifier.width(100.dp)
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Pajak PPN (11%)", style = MaterialTheme.typography.labelSmall)
                            Switch(
                                checked = applyPpn,
                                onCheckedChange = { applyPpn = it }
                            )
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                    if (discountAmount > 0 || ppnAmount > 0) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Subtotal", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("Rp ${String.format("%,.0f", subtotal)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (discountAmount > 0) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Diskon Promo", style = MaterialTheme.typography.labelSmall, color = Color(0xFFC62828))
                                Text("-Rp ${String.format("%,.0f", discountAmount)}", style = MaterialTheme.typography.labelSmall, color = Color(0xFFC62828))
                            }
                        }
                        if (ppnAmount > 0) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("PPN 11%", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("Rp ${String.format("%,.0f", ppnAmount)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                    }

                    Text(
                        text = "Total: Rp ${String.format("%,.0f", totalAmount)}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = { showCheckoutDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = cart.isNotEmpty(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Checkout Bayar", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(60.dp))
    }

    if (showCheckoutDialog) {
        val subtotal = cart.entries.sumOf { it.key.hargaJual * it.value }
        val discountAmount = subtotal * (discountPercent / 100f)
        val taxableAmount = subtotal - discountAmount
        val ppnAmount = if (applyPpn) taxableAmount * 0.11 else 0.0
        val totalAmount = taxableAmount + ppnAmount

        CheckoutDialog(
            totalAmount = totalAmount,
            onDismiss = { showCheckoutDialog = false },
            onConfirm = { paymentMethod ->
                viewModel.checkoutCart(paymentMethod, selectedCustomerId)
                showCheckoutDialog = false
            }
        )
    }

    if (showAddCustomerDialog) {
        AddCustomerDialog(
            onDismiss = { showAddCustomerDialog = false },
            onConfirm = { name, email, phone ->
                viewModel.addCustomer(name, email, phone)
                showAddCustomerDialog = false
            }
        )
    }
}

@Composable
fun CheckoutDialog(
    totalAmount: Double,
    onDismiss: () -> Unit,
    onConfirm: (method: String) -> Unit
) {
    var selectedMethod by remember { mutableStateOf("TUNAI") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Metode Pembayaran POS",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = "Total Tagihan: Rp ${String.format("%,.0f", totalAmount)}",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedMethod = "TUNAI" },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = selectedMethod == "TUNAI", onClick = { selectedMethod = "TUNAI" })
                        Text("Tunai (Cash)")
                    }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedMethod = "QRIS" },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = selectedMethod == "QRIS", onClick = { selectedMethod = "QRIS" })
                        Text("QRIS (Digital Cash)")
                    }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedMethod = "DEBIT" },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = selectedMethod == "DEBIT", onClick = { selectedMethod = "DEBIT" })
                        Text("Debit / Kartu Kredit")
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) { Text("Batal") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { onConfirm(selectedMethod) }
                    ) {
                        Text("Selesaikan Order")
                    }
                }
            }
        }
    }
}

@Composable
fun AddCustomerDialog(
    onDismiss: () -> Unit,
    onConfirm: (name: String, email: String, phone: String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Daftar Customer Baru",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Lengkap") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Alamat Email") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Nomor Telepon") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) { Text("Batal") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (name.isNotEmpty() && phone.isNotEmpty()) {
                                onConfirm(name, email, phone)
                            }
                        }
                    ) {
                        Text("Daftarkan")
                    }
                }
            }
        }
    }
}

// ======================== HR SCREEN ========================

@Composable
fun HrScreen(
    viewModel: SaaSViewModel,
    modifier: Modifier = Modifier
) {
    val employees by viewModel.employees.collectAsStateWithLifecycle()
    val attendanceList by viewModel.attendance.collectAsStateWithLifecycle()
    val payrolls by viewModel.payroll.collectAsStateWithLifecycle()

    var showAddEmployeeDialog by remember { mutableStateOf(false) }
    var selectedEmployeeForPayroll by remember { mutableStateOf<Employee?>(null) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // HR Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Manajemen HR & Payroll",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Kelola data karyawan, absensi, slip gaji",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Button(
                    onClick = { showAddEmployeeDialog = true },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.PersonAdd, contentDescription = "Add employee")
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Karyawan")
                }
            }
        }

        // Section: Employees Directory
        item {
            Text("Daftar Karyawan", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }

        if (employees.isEmpty()) {
            item {
                Text(
                    "Belum ada karyawan terdaftar di unit bisnis ini.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            items(employees) { emp ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(emp.fullName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                            Text("Posisi: ${emp.position} (${emp.role})", style = MaterialTheme.typography.bodySmall)
                            Text("Gaji Pokok: Rp ${String.format("%,.0f", emp.salary)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                            Text("PIN Login Portal: ${emp.pin}", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                        }
                        Row {
                            IconButton(onClick = { selectedEmployeeForPayroll = emp }) {
                                Icon(Icons.Default.Payments, contentDescription = "Gaji", tint = Color(0xFF2E7D32))
                            }
                            IconButton(onClick = { viewModel.deleteEmployee(emp.id, emp.fullName) }) {
                                Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Color.Gray)
                            }
                        }
                    }
                }
            }
        }

        // Section: Today Attendance
        item {
            Text("Kehadiran Karyawan (Attendance)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }

        if (attendanceList.isEmpty()) {
            item {
                Text("Belum ada logs absensi hari ini.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            }
        } else {
            items(attendanceList) { att ->
                val empName = employees.find { it.id == att.employeeId }?.fullName ?: "Karyawan"
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(empName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                            Text("Tanggal: ${att.date}", style = MaterialTheme.typography.bodySmall)
                            Text("Check-In: ${att.checkIn} | Check-Out: ${att.checkOut ?: "Belum"}", style = MaterialTheme.typography.bodySmall)
                        }
                        Surface(
                            color = if (att.status == "HADIR") Color(0xFFE8F5E9) else Color(0xFFFFF3E0),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                att.status,
                                color = if (att.status == "HADIR") Color(0xFF2E7D32) else Color(0xFFE65100),
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // Section: Payroll History
        item {
            Text("Riwayat Payroll (Gaji Bulanan)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }

        if (payrolls.isEmpty()) {
            item {
                Text("Belum ada pembayaran gaji tercatat bulan ini.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            }
        } else {
            items(payrolls) { pay ->
                val empName = employees.find { it.id == pay.employeeId }?.fullName ?: "Karyawan"
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(empName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                            Text(pay.monthYear, style = MaterialTheme.typography.bodySmall)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Total Dibayar:", style = MaterialTheme.typography.bodySmall)
                            Text("Rp ${String.format("%,.0f", pay.netSalary)}", fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }

        // Section: Jadwal Shift Kerja & KPI Karyawan (Enterprise)
        item {
            Text("Jadwal Shift & KPI Karyawan", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }

        if (employees.isEmpty()) {
            item {
                Text("Daftar karyawan kosong untuk penjadwalan.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            }
        } else {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f)),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Shift Planner Aktif", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                            Icon(Icons.Default.Schedule, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                        }

                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                        employees.forEach { emp ->
                            var selectedShift by remember { mutableStateOf("PAGI (08:00 - 16:00)") }
                            
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(emp.fullName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                    Text("Shift: $selectedShift", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                                }
                                
                                Box {
                                    var expanded by remember { mutableStateOf(false) }
                                    OutlinedButton(
                                        onClick = { expanded = true },
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text("Ubah", style = MaterialTheme.typography.labelSmall)
                                    }
                                    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                        DropdownMenuItem(
                                            text = { Text("Pagi (08:00 - 16:00)") },
                                            onClick = {
                                                selectedShift = "PAGI (08:00 - 16:00)"
                                                expanded = false
                                            }
                                        )
                                        DropdownMenuItem(
                                            text = { Text("Sore (16:00 - 24:00)") },
                                            onClick = {
                                                selectedShift = "SORE (16:00 - 24:00)"
                                                expanded = false
                                            }
                                        )
                                        DropdownMenuItem(
                                            text = { Text("Malam (24:00 - 08:00)") },
                                            onClick = {
                                                selectedShift = "MALAM (24:00 - 08:00)"
                                                expanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }

    if (showAddEmployeeDialog) {
        AddEmployeeDialog(
            onDismiss = { showAddEmployeeDialog = false },
            onConfirm = { name, pos, sal, pin, role ->
                viewModel.addEmployee(name, pos, sal, pin, role)
                showAddEmployeeDialog = false
            }
        )
    }

    if (selectedEmployeeForPayroll != null) {
        val emp = selectedEmployeeForPayroll!!
        ProcessPayrollDialog(
            employeeName = emp.fullName,
            basicSalary = emp.salary,
            onDismiss = { selectedEmployeeForPayroll = null },
            onConfirm = { allowance, deduction ->
                viewModel.processPayroll(emp.id, emp.fullName, emp.salary, allowance, deduction)
                selectedEmployeeForPayroll = null
            }
        )
    }
}

@Composable
fun AddEmployeeDialog(
    onDismiss: () -> Unit,
    onConfirm: (name: String, pos: String, salary: Double, pin: String, role: String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var position by remember { mutableStateOf("") }
    var salary by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("Staff") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Daftar Karyawan Baru",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Karyawan") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = position,
                    onValueChange = { position = it },
                    label = { Text("Posisi Pekerjaan") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = salary,
                    onValueChange = { salary = it },
                    label = { Text("Gaji Bulanan (IDR)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = pin,
                    onValueChange = { pin = it },
                    label = { Text("PIN Portal (4 Digit)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = role == "Staff", onClick = { role = "Staff" })
                    Text("Staff")
                    Spacer(modifier = Modifier.width(16.dp))
                    RadioButton(selected = role == "Manager", onClick = { role = "Manager" })
                    Text("Manager")
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) { Text("Batal") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val salDouble = salary.toDoubleOrNull() ?: 0.0
                            if (name.isNotEmpty() && position.isNotEmpty() && pin.length >= 4) {
                                onConfirm(name, position, salDouble, pin, role)
                            }
                        }
                    ) {
                        Text("Simpan")
                    }
                }
            }
        }
    }
}

@Composable
fun ProcessPayrollDialog(
    employeeName: String,
    basicSalary: Double,
    onDismiss: () -> Unit,
    onConfirm: (allowance: Double, deduction: Double) -> Unit
) {
    var allowance by remember { mutableStateOf("") }
    var deduction by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Proses Gaji: $employeeName",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = "Gaji Pokok: Rp ${String.format("%,.0f", basicSalary)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )

                OutlinedTextField(
                    value = allowance,
                    onValueChange = { allowance = it },
                    label = { Text("Tunjangan Tambahan (IDR)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = deduction,
                    onValueChange = { deduction = it },
                    label = { Text("Potongan Gaji (IDR)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) { Text("Batal") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val all = allowance.toDoubleOrNull() ?: 0.0
                            val ded = deduction.toDoubleOrNull() ?: 0.0
                            onConfirm(all, ded)
                        }
                    ) {
                        Text("Bayar Gaji")
                    }
                }
            }
        }
    }
}

// ======================== CRM SCREEN ========================

@Composable
fun CrmScreen(
    viewModel: SaaSViewModel,
    modifier: Modifier = Modifier
) {
    val deals by viewModel.crmDeals.collectAsStateWithLifecycle()
    var showAddDealDialog by remember { mutableStateOf(false) }
    var selectedDealForFollowUp by remember { mutableStateOf<CrmDeal?>(null) }

    val stages = listOf("PROSPECT", "NEGOTIATION", "WON", "LOST")

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "CRM Penjualan (Pipeline)",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Lacak prospek dan kesepakatan bisnis",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Button(
                onClick = { showAddDealDialog = true },
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add deal")
                Spacer(modifier = Modifier.width(4.dp))
                Text("Deal")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Horizontal scrolling Board columns
        LazyRow(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(stages) { stage ->
                val stageDeals = deals.filter { it.stage == stage }
                Card(
                    modifier = Modifier
                        .width(280.dp)
                        .fillMaxHeight(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = stage,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = when (stage) {
                                    "WON" -> Color(0xFF2E7D32)
                                    "LOST" -> Color(0xFFC62828)
                                    "NEGOTIATION" -> Color(0xFF1565C0)
                                    else -> Color.Gray
                                }
                            )
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = CircleShape
                            ) {
                                Text(
                                    "${stageDeals.size}",
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            items(stageDeals) { deal ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text(deal.companyName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                                        Text("Kontak: ${deal.contactName}", style = MaterialTheme.typography.bodySmall)
                                        Text("Telp: ${deal.phone}", style = MaterialTheme.typography.labelSmall)
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            "Nilai: Rp ${String.format("%,.0f", deal.dealValue)}",
                                            fontWeight = FontWeight.Bold,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.primary
                                        )

                                        Spacer(modifier = Modifier.height(8.dp))

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.End,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            IconButton(
                                                onClick = { selectedDealForFollowUp = deal },
                                                modifier = Modifier.size(24.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Chat,
                                                    contentDescription = "Follow Up",
                                                    tint = Color(0xFF2E7D32),
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(4.dp))
                                            IconButton(onClick = { viewModel.deleteDeal(deal.id) }, modifier = Modifier.size(24.dp)) {
                                                Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Color.Gray, modifier = Modifier.size(16.dp))
                                            }
                                            if (stage != "WON" && stage != "LOST") {
                                                Spacer(modifier = Modifier.width(4.dp))
                                                IconButton(
                                                    onClick = {
                                                        val next = if (stage == "PROSPECT") "NEGOTIATION" else "WON"
                                                        viewModel.updateDealStage(deal.id, deal.contactName, deal.dealValue, next)
                                                    },
                                                    modifier = Modifier.size(24.dp)
                                                ) {
                                                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = "Next", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(60.dp))
    }

    if (showAddDealDialog) {
        AddDealDialog(
            onDismiss = { showAddDealDialog = false },
            onConfirm = { contact, company, value, phone ->
                viewModel.addDeal(contact, company, value, phone)
                showAddDealDialog = false
            }
        )
    }

    selectedDealForFollowUp?.let { deal ->
        CrmFollowUpDialog(
            deal = deal,
            onDismiss = { selectedDealForFollowUp = null },
            onSendSimulated = { msgText ->
                viewModel.logCrmFollowUp(deal.companyName, deal.contactName)
                selectedDealForFollowUp = null
            }
        )
    }
}

@Composable
fun CrmFollowUpDialog(
    deal: CrmDeal,
    onDismiss: () -> Unit,
    onSendSimulated: (message: String) -> Unit
) {
    var messageText by remember { mutableStateOf("Halo Bpk/Ibu ${deal.contactName} dari ${deal.companyName},\n\nKami ingin memfollow-up diskusi penawaran kami senilai Rp ${String.format("%,.0f", deal.dealValue)}. Apakah ada hal yang bisa kami bantu lanjuti?") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Asisten Auto-Followup WhatsApp",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Gunakan template otomatis untuk menghubungi prospek klien",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = messageText,
                    onValueChange = { messageText = it },
                    label = { Text("Pesan WhatsApp") },
                    modifier = Modifier.fillMaxWidth().height(140.dp),
                    shape = RoundedCornerShape(12.dp),
                    maxLines = 5
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Tujuan: ${deal.phone}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(onClick = onDismiss) {
                            Text("Batal")
                        }
                        Button(
                            onClick = {
                                onSendSimulated(messageText)
                            },
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Simulasi Kirim")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AddDealDialog(
    onDismiss: () -> Unit,
    onConfirm: (contact: String, company: String, value: Double, phone: String) -> Unit
) {
    var contact by remember { mutableStateOf("") }
    var company by remember { mutableStateOf("") }
    var value by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Tambah Pipeline Deal Baru",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                OutlinedTextField(
                    value = company,
                    onValueChange = { company = it },
                    label = { Text("Nama Perusahaan / Bisnis") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = contact,
                    onValueChange = { contact = it },
                    label = { Text("Nama Penghubung (Contact)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = value,
                    onValueChange = { value = it },
                    label = { Text("Estimasi Nilai Deal (IDR)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Nomor Telepon") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) { Text("Batal") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val vDouble = value.toDoubleOrNull() ?: 0.0
                            if (company.isNotEmpty() && contact.isNotEmpty() && vDouble > 0) {
                                onConfirm(contact, company, vDouble, phone)
                            }
                        }
                    ) {
                        Text("Simpan Deal")
                    }
                }
            }
        }
    }
}

// ======================== PORTAL KARYAWAN ========================

@Composable
fun PortalScreen(
    viewModel: SaaSViewModel,
    modifier: Modifier = Modifier
) {
    val loggedStaff by viewModel.loggedStaffEmployee.collectAsStateWithLifecycle()
    val authError by viewModel.staffAuthError.collectAsStateWithLifecycle()
    val activeUnit by viewModel.activeUnit.collectAsStateWithLifecycle()

    var pinText by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (loggedStaff == null) {
            // PIN Login interface
            Card(
                modifier = Modifier.fillMaxWidth(0.9f),
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Lock",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(48.dp)
                    )

                    Text(
                        text = "Portal Karyawan",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        text = "Masuk menggunakan PIN Anda untuk akses absensi dan kasir unit bisnis: ${activeUnit?.namaUnit ?: "N/A"}",
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    OutlinedTextField(
                        value = pinText,
                        onValueChange = { if (it.length <= 4) pinText = it },
                        label = { Text("Masukkan PIN 4-Digit") },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    if (authError != null) {
                        Text(
                            text = authError!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Red,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Button(
                        onClick = {
                            if (pinText.isNotEmpty()) {
                                viewModel.loginStaff(pinText)
                                pinText = ""
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Masuk Portal")
                    }
                }
            }
        } else {
            // Logged in Staff interface
            val staff = loggedStaff!!
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Surface(
                        color = MaterialTheme.colorScheme.primary,
                        shape = CircleShape,
                        modifier = Modifier.size(64.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Badge, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(32.dp))
                        }
                    }

                    Text(
                        text = "Selamat Datang, ${staff.fullName}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        text = "Jabatan: ${staff.position} • Unit: ${activeUnit?.namaUnit ?: "N/A"}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    HorizontalDivider()

                    Text("Absensi Harian", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = { viewModel.checkInStaffPortal() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Check In")
                        }
                        Button(
                            onClick = { viewModel.checkOutStaffPortal() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF6C00)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Check Out")
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedButton(
                        onClick = { viewModel.logoutStaff() },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Keluar Portal Karyawan")
                    }
                }
            }
        }
    }
}

// ======================== AI ASSISTANT CHAT ========================

@Composable
fun AiChatScreen(
    viewModel: SaaSViewModel,
    modifier: Modifier = Modifier
) {
    val chatMessages by viewModel.chatMessages.collectAsStateWithLifecycle()
    val isLoading by viewModel.isAiLoading.collectAsStateWithLifecycle()

    var textState by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // AI Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.SmartToy,
                contentDescription = "AI",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(36.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "AI Business Advisor",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Asisten AI cerdas berbasis data usaha real-time Anda",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Quick suggestions chips
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            item {
                SuggestionChip(
                    onClick = { textState = "Bagaimana kesehatan margin laba dan runway kas saya saat ini?" },
                    label = { Text("Analisis Laba & Runway") }
                )
            }
            item {
                SuggestionChip(
                    onClick = { textState = "Berikan saran strategis untuk mengoptimalkan stok inventori produk utama saya." },
                    label = { Text("Optimasi Inventori") }
                )
            }
            item {
                SuggestionChip(
                    onClick = { textState = "Bagaimana prospek pipeline deals CRM saya bulan ini?" },
                    label = { Text("Prospek CRM") }
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Chat Bubble list
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(chatMessages) { chat ->
                val isAi = chat.sender == "AI"
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = if (isAi) Arrangement.Start else Arrangement.End
                ) {
                    Card(
                        modifier = Modifier.fillMaxWidth(0.85f),
                        shape = RoundedCornerShape(
                            topStart = 16.dp,
                            topEnd = 16.dp,
                            bottomStart = if (isAi) 0.dp else 16.dp,
                            bottomEnd = if (isAi) 16.dp else 0.dp
                        ),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isAi) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.primaryContainer
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = if (isAi) "Asisten AI" else "Anda",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = if (isAi) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = chat.message,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (isAi) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                }
            }

            if (isLoading) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Start
                    ) {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Menganalisis data keuangan & bisnis Anda...", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Input bottom bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = textState,
                onValueChange = { textState = it },
                placeholder = { Text("Tanyakan kondisi bisnis Anda...") },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(24.dp)
            )
            IconButton(
                onClick = {
                    if (textState.trim().isNotEmpty()) {
                        viewModel.sendMessageToAi(textState)
                        textState = ""
                    }
                },
                modifier = Modifier
                    .background(MaterialTheme.colorScheme.primary, CircleShape)
                    .size(48.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Send,
                    contentDescription = "Send",
                    tint = MaterialTheme.colorScheme.onPrimary
                )
            }
        }
        Spacer(modifier = Modifier.height(60.dp))
    }
}

// ======================== SETTINGS & BILLING ========================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SaaSViewModel,
    modifier: Modifier = Modifier
) {
    val activeUnit by viewModel.activeUnit.collectAsStateWithLifecycle()
    val allUnits by viewModel.allUnits.collectAsStateWithLifecycle()
    val themeMode by viewModel.themeMode.collectAsStateWithLifecycle()

    var showAddUnitDialog by remember { mutableStateOf(false) }
    var selectedPlan by remember { mutableStateOf("PRO") } // Simulation state

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Settings Header
        item {
            Column {
                Text(
                    text = "Pengaturan Akun & Billing",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Kelola data unit bisnis dan paket Bizgrow",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Section: Billing Plan Limits
        item {
            Text("Paket Bizgrow Terdaftar", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "PLAN: $selectedPlan",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Surface(
                            color = MaterialTheme.colorScheme.primary,
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                "AKTIF",
                                color = MaterialTheme.colorScheme.onPrimary,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    val limit = when (selectedPlan) {
                        "FREE" -> 3
                        "PRO" -> 10
                        else -> 999
                    }

                    Text(
                        "Kuota Unit Bisnis: ${allUnits.size} / $limit Unit",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )

                    // Linear progress
                    LinearProgressIndicator(
                        progress = (allUnits.size.toFloat() / limit).coerceIn(0f, 1f),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { selectedPlan = "FREE" },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Free Plan", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
                        }
                        Button(
                            onClick = { selectedPlan = "PRO" },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Pro Plan", style = MaterialTheme.typography.labelSmall)
                        }
                        Button(
                            onClick = { selectedPlan = "ENTERPRISE" },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Enterprise", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }

        // Section: Tema Aplikasi (Light / Dark / System)
        item {
            Text("Tema Aplikasi", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    Triple("SYSTEM", "Sistem", Icons.Default.SettingsSuggest),
                    Triple("LIGHT", "Terang", Icons.Default.LightMode),
                    Triple("DARK", "Gelap", Icons.Default.DarkMode)
                ).forEach { (mode, label, icon) ->
                    val isSelected = themeMode == mode
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { viewModel.setThemeMode(mode) },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        ),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(
                            width = 1.5.dp,
                            color = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent
                        )
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp)
                                .fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = icon,
                                contentDescription = null,
                                tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = label,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        // Section: Multi Tenant Unit Bisnis Directory
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Daftar Unit Bisnis & Cabang", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Button(
                    onClick = { showAddUnitDialog = true },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.AddHome, contentDescription = "Add Unit")
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Unit")
                }
            }
        }

        items(allUnits) { unit ->
            val isActive = unit.id == activeUnit?.id
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { viewModel.switchUnit(unit.id) },
                colors = CardDefaults.cardColors(
                    containerColor = if (isActive) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f) else MaterialTheme.colorScheme.surface
                ),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(
                    width = if (isActive) 2.dp else 1.dp,
                    color = if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(unit.namaUnit, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                            if (isActive) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Surface(
                                    color = MaterialTheme.colorScheme.primary,
                                    shape = CircleShape,
                                    modifier = Modifier.size(8.dp)
                                ) {}
                            }
                        }
                        Text("Kategori: ${unit.kategori}", style = MaterialTheme.typography.bodySmall)
                        Text("Alamat: ${unit.alamat}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                    IconButton(onClick = { viewModel.deleteUnit(unit.id) }) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color.Gray)
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }

    if (showAddUnitDialog) {
        AddUnitDialog(
            onDismiss = { showAddUnitDialog = false },
            onConfirm = { name, address, modal, category ->
                viewModel.addUnit(name, address, modal, category)
                showAddUnitDialog = false
            }
        )
    }
}

@Composable
fun AddUnitDialog(
    onDismiss: () -> Unit,
    onConfirm: (name: String, address: String, modal: Double, category: String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var modal by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Ritel & Kelontong") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Buat Unit Bisnis / Cabang Baru",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Toko / Usaha") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("Alamat") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = modal,
                    onValueChange = { modal = it },
                    label = { Text("Modal Awal (IDR)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = category,
                    onValueChange = { category = it },
                    label = { Text("Kategori Usaha") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) { Text("Batal") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val modalDouble = modal.toDoubleOrNull() ?: 0.0
                            if (name.isNotEmpty() && address.isNotEmpty() && modalDouble > 0) {
                                onConfirm(name, address, modalDouble, category)
                            }
                        }
                    ) {
                        Text("Buat Unit")
                    }
                }
            }
        }
    }
}

// ======================== ACCOUNTING SCREEN ========================

@Composable
fun AccountingScreen(
    viewModel: SaaSViewModel,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabTitles = listOf("Laporan", "Jurnal", "Buku Besar", "Hutang/Piutang")

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Column {
            Text(
                text = "BIZGROW FINANCIALS",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp
            )
            Text(
                text = "Akuntansi & Finansial",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        // Tab Row
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color.Transparent,
            contentColor = MaterialTheme.colorScheme.primary,
            divider = {}
        ) {
            tabTitles.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = {
                        Text(
                            text = title,
                            fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                )
            }
        }

        // Tab Content
        Box(modifier = Modifier.weight(1f)) {
            when (selectedTab) {
                0 -> AccountingLaporanTab(viewModel)
                1 -> AccountingJurnalTab(viewModel)
                2 -> AccountingBukuBesarTab(viewModel)
                3 -> AccountingHutangPiutangTab(viewModel)
            }
        }
    }
}

@Composable
fun AccountingLaporanTab(viewModel: SaaSViewModel) {
    val bi by viewModel.biMetrics.collectAsStateWithLifecycle()

    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // Laba Rugi Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Laporan Laba Rugi",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    HorizontalDivider()

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Pendapatan (Inflow)", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            text = "Rp ${String.format("%,.0f", bi.totalMasuk)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF2E7D32)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Pengeluaran (Outflow)", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            text = "Rp ${String.format("%,.0f", bi.totalKeluar)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFC62828)
                        )
                    }

                    HorizontalDivider()

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Laba Bersih (Net)", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        Text(
                            text = "Rp ${String.format("%,.0f", bi.netProfit)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (bi.netProfit >= 0) Color(0xFF2E7D32) else Color(0xFFC62828)
                        )
                    }
                }
            }
        }

        // Neraca Saldo Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Ringkasan Neraca",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    HorizontalDivider()

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Aset Lancar (Kas & Bank)", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            text = "Rp ${String.format("%,.0f", bi.totalMasuk - bi.totalKeluar)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Kewajiban & Modal", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            text = "Rp ${String.format("%,.0f", bi.totalMasuk - bi.totalKeluar)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AccountingJurnalTab(viewModel: SaaSViewModel) {
    val transactions by viewModel.transactions.collectAsStateWithLifecycle()

    if (transactions.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Tidak ada transaksi jurnal terdaftar.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    } else {
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(transactions) { tx ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = tx.keterangan,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Kategori: ${tx.kategoriTrx}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "Rp ${String.format("%,.0f", tx.nominal)}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (tx.kategoriTrx == "MASUK") Color(0xFF2E7D32) else Color(0xFFC62828)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "TRX-" + tx.id,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AccountingBukuBesarTab(viewModel: SaaSViewModel) {
    val transactions by viewModel.transactions.collectAsStateWithLifecycle()

    val ledgerAccounts = transactions.groupBy { it.kategoriTrx.ifEmpty { "UMUM" } }

    if (ledgerAccounts.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Buku besar kosong.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    } else {
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(ledgerAccounts.entries.toList()) { entry ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Kategori Registrasi: ${entry.key}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        HorizontalDivider()
                        Spacer(modifier = Modifier.height(10.dp))

                        entry.value.forEach { tx ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = tx.keterangan,
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = if (tx.kategoriTrx == "MASUK") "Rp ${String.format("%,.0f", tx.nominal)} (D)" else "Rp ${String.format("%,.0f", tx.nominal)} (K)",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (tx.kategoriTrx == "MASUK") Color(0xFF2E7D32) else Color(0xFFC62828)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AccountingHutangPiutangTab(viewModel: SaaSViewModel) {
    val deals by viewModel.crmDeals.collectAsStateWithLifecycle()

    val piutangDeals = deals.filter { it.stage.uppercase() == "WON" || it.stage.uppercase() == "NEGOTIATION" }

    if (piutangDeals.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Tidak ada piutang (Outstanding Invoice) aktif.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    } else {
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(piutangDeals) { deal ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = deal.companyName.ifEmpty { "No Company" },
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    text = "PIUTANG (AR)",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFF1D4ED8),
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Customer: ${deal.contactName}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Estimasi Nominal", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                text = "Rp ${String.format("%,.0f", deal.dealValue)}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
        }
    }
}
