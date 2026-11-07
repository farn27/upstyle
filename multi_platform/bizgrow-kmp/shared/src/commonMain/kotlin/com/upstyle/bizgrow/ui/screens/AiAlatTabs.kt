package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel

// Tab "Analisis" (AI Financial Advisor) dan "Laporan WA" pada layar Asisten AI.

@Composable
fun FinancialAdvisorTab(viewModel: AppViewModel) {
    var customQuestion by remember { mutableStateOf("") }
    val aiAdvisorResult by viewModel.aiAdvisorResult.collectAsState(initial = viewModel.aiAdvisorResult.value)
    val isAiAdvisorLoading by viewModel.isAiAdvisorLoading.collectAsState(initial = viewModel.isAiAdvisorLoading.value)
    val aiAdvisorError by viewModel.aiAdvisorError.collectAsState(initial = viewModel.aiAdvisorError.value)
    val activeUnitId by viewModel.activeUnitId.collectAsState(initial = viewModel.activeUnitId.value)

    val scrollState = androidx.compose.foundation.rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // ─── Input Card ───────────────────────────────────────────────────────
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "Analisis Keuangan AI",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "AI akan menganalisis data keuangan bisnis Anda dan memberikan insight serta rekomendasi aksi.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                // Guard: unit belum dipilih
                if (activeUnitId == 0) {
                    Text(
                        "Pilih unit bisnis terlebih dahulu",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error
                    )
                }

                // Field pertanyaan custom (opsional)
                OutlinedTextField(
                    value = customQuestion,
                    onValueChange = { customQuestion = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Pertanyaan custom (opsional)") },
                    placeholder = { Text("Contoh: Apa produk terlaris bulan ini?") },
                    minLines = 2,
                    maxLines = 4,
                    enabled = activeUnitId != 0 && !isAiAdvisorLoading
                )

                Button(
                    onClick = {
                        val question = customQuestion.ifBlank {
                            "Analisis keuangan bisnis saya untuk 3 bulan terakhir, berikan insights dan rekomendasi aksi."
                        }
                        viewModel.aiAdvisor(question)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = activeUnitId != 0 && !isAiAdvisorLoading
                ) {
                    if (isAiAdvisorLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Menganalisis...")
                    } else {
                        Icon(
                            Icons.Default.AutoAwesome,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Analisis Sekarang")
                    }
                }
            }
        }

        // ─── Loading indicator ────────────────────────────────────────────────
        if (isAiAdvisorLoading) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("AI sedang menganalisis data keuangan Anda...", style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        // ─── Error + Retry ────────────────────────────────────────────────────
        // Gunakan aiAdvisorError (dedicated state) bukan uiState.error global
        if (!isAiAdvisorLoading && aiAdvisorError != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        aiAdvisorError ?: "Terjadi kesalahan",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                    Button(
                        onClick = {
                            viewModel.clearAiAdvisorResult()
                            val question = customQuestion.ifBlank {
                                "Analisis keuangan bisnis saya untuk 3 bulan terakhir, berikan insights dan rekomendasi aksi."
                            }
                            viewModel.aiAdvisor(question)
                        },
                        enabled = activeUnitId != 0,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Coba Lagi")
                    }
                }
            }
        }

        // ─── Hasil Analisis ───────────────────────────────────────────────────
        if (aiAdvisorResult != null) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.AutoAwesome,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                "Hasil Analisis",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        IconButton(onClick = { viewModel.clearAiAdvisorResult() }) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Tutup hasil",
                                modifier = Modifier.size(18.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    HorizontalDivider()
                    Text(
                        text = aiAdvisorResult!!,
                        style = MaterialTheme.typography.bodyMedium,
                        lineHeight = MaterialTheme.typography.bodyMedium.lineHeight
                    )
                }
            }
        }
    }
}

@Composable
fun WaReportTab(viewModel: AppViewModel) {
    var reportType by remember { mutableStateOf("daily") }
    val laporanWa by viewModel.laporanWa.collectAsState(initial = viewModel.laporanWa.value)
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    val activeUnitId by viewModel.activeUnitId.collectAsState(initial = viewModel.activeUnitId.value)

    val periodeMap = mapOf("daily" to "hari_ini", "weekly" to "minggu_ini", "monthly" to "bulan_ini")

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Generate Laporan WhatsApp", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("AI akan membuat laporan otomatis yang siap dikirim ke grup WhatsApp.", style = MaterialTheme.typography.bodySmall)

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = reportType == "daily", onClick = { reportType = "daily" }, label = { Text("Harian") })
                    FilterChip(selected = reportType == "weekly", onClick = { reportType = "weekly" }, label = { Text("Mingguan") })
                    FilterChip(selected = reportType == "monthly", onClick = { reportType = "monthly" }, label = { Text("Bulanan") })
                }

                Button(
                    onClick = {
                        if (activeUnitId > 0) {
                            viewModel.loadLaporanWa(periodeMap[reportType] ?: "hari_ini")
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !uiState.isLoading && activeUnitId > 0
                ) {
                    if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                    else Text("Generate Laporan")
                }
            }
        }

        laporanWa?.let { laporan ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Laporan Siap Kirim", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Text(laporan.teks, style = MaterialTheme.typography.bodyMedium)

                    // Tombol share: copy ke clipboard, lalu buka WhatsApp
                    val context = androidx.compose.ui.platform.LocalContext.current
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Tombol Copy
                        OutlinedButton(
                            onClick = {
                                val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE)
                                    as android.content.ClipboardManager
                                clipboard.setPrimaryClip(
                                    android.content.ClipData.newPlainText("Laporan WhatsApp", laporan.teks)
                                )
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.ContentCopy, "Salin", modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Salin")
                        }

                        // Tombol Kirim ke WhatsApp
                        Button(
                            onClick = {
                                try {
                                    val encoded = java.net.URLEncoder.encode(laporan.teks, "UTF-8")
                                    val intent = android.content.Intent(
                                        android.content.Intent.ACTION_VIEW,
                                        android.net.Uri.parse("https://wa.me/?text=$encoded")
                                    )
                                    intent.setPackage("com.whatsapp")
                                    // Fallback ke browser jika WhatsApp tidak terpasang
                                    val chooser = android.content.Intent.createChooser(intent, "Kirim via")
                                    context.startActivity(chooser)
                                } catch (e: Exception) {
                                    // WhatsApp tidak terpasang, fallback ke share biasa
                                    val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(android.content.Intent.EXTRA_TEXT, laporan.teks)
                                    }
                                    context.startActivity(android.content.Intent.createChooser(shareIntent, "Bagikan laporan"))
                                }
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Share, "Kirim", modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("WhatsApp")
                        }
                    }
                }
            }
        }
    }
}
