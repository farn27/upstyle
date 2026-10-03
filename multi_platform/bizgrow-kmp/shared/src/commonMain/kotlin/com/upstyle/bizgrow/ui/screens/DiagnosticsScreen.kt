package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiagnosticsScreen(viewModel: AppViewModel) {
    val helpState by viewModel.helpState.collectAsState()
    val auditLog = remember { viewModel.getAuditLog(20) }

    LaunchedEffect(Unit) { viewModel.runDiagnostics() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Diagnostik Sistem", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp)
                .fillMaxSize()
        ) {
            val diag = helpState.diagnosticResult

            if (helpState.isLoading && diag == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (diag == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Jalankan diagnostik untuk melihat hasil")
                }
            } else {
                // Overall status banner
                val overallOk = diag.overallStatus == "ok"
                val bannerColor = when (diag.overallStatus) {
                    "ok"      -> MaterialTheme.colorScheme.primaryContainer
                    "warning" -> MaterialTheme.colorScheme.tertiaryContainer
                    else      -> MaterialTheme.colorScheme.errorContainer
                }
                val bannerTextColor = when (diag.overallStatus) {
                    "ok"      -> MaterialTheme.colorScheme.onPrimaryContainer
                    "warning" -> MaterialTheme.colorScheme.onTertiaryContainer
                    else      -> MaterialTheme.colorScheme.onErrorContainer
                }
                Surface(
                    color = bannerColor,
                    shape = MaterialTheme.shapes.medium,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = if (overallOk) Icons.Default.CheckCircle else Icons.Default.Warning,
                            contentDescription = null,
                            tint = bannerTextColor
                        )
                        Column {
                            Text(
                                text = when (diag.overallStatus) {
                                    "ok"      -> "Sistem berjalan normal"
                                    "warning" -> "Ada peringatan"
                                    else      -> "Terdeteksi masalah"
                                },
                                fontWeight = FontWeight.Bold,
                                color = bannerTextColor
                            )
                            if (diag.timestamp.isNotEmpty()) {
                                Text(
                                    text = "Terakhir diperiksa: ${diag.timestamp}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = bannerTextColor
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                // Diagnostic checks list
                if (diag.checks.isNotEmpty()) {
                    Text("Hasil Pemeriksaan", fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(diag.checks) { check ->
                            val checkOk = check.status == "ok"
                            val checkColor = when (check.status) {
                                "ok"      -> MaterialTheme.colorScheme.primary
                                "warning" -> MaterialTheme.colorScheme.tertiary
                                else      -> MaterialTheme.colorScheme.error
                            }
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = when (check.status) {
                                            "ok"      -> Icons.Default.CheckCircle
                                            "warning" -> Icons.Default.Warning
                                            else      -> Icons.Default.Error
                                        },
                                        contentDescription = null,
                                        tint = checkColor
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Text(
                                        check.name,
                                        fontWeight = FontWeight.Medium,
                                        modifier = Modifier.weight(1f)
                                    )
                                    Text(
                                        text = check.status.uppercase(),
                                        color = checkColor,
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                }
                            }
                        }
                        item {
                            Spacer(Modifier.height(16.dp))
                            // Audit log section
                            if (auditLog.isNotEmpty()) {
                                Text("Log Aktivitas Terakhir", fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(8.dp))
                                auditLog.take(10).forEach { entry ->
                                    Text(
                                        "• ${entry.action} [${entry.entityType}] — ${entry.entityId}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Spacer(Modifier.height(16.dp))
                            }
                            Button(
                                onClick = { viewModel.runDiagnostics() },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null)
                                Spacer(Modifier.width(8.dp))
                                Text("Jalankan Ulang")
                            }
                        }
                    }
                } else {
                    Text("Tidak ada data pemeriksaan", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(16.dp))
                    // Audit log section
                    if (auditLog.isNotEmpty()) {
                        Text("Log Aktivitas Terakhir", fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(8.dp))
                        auditLog.take(10).forEach { entry ->
                            Text(
                                "• ${entry.action} [${entry.entityType}] — ${entry.entityId}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Spacer(Modifier.height(16.dp))
                    }
                    Button(
                        onClick = { viewModel.runDiagnostics() },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Jalankan Ulang")
                    }
                }
            }
        }
    }
}
