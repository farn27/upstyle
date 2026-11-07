package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExportImportScreen(viewModel: AppViewModel) {
    val exportImportState by viewModel.exportImportState.collectAsState()
    var selectedTab by remember { mutableStateOf(0) }

    LaunchedEffect(Unit) { viewModel.loadExportHistory() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Export / Import", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Export") })
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Import") })
            }
            when (selectedTab) {
                0 -> ExportTab(exportImportState, viewModel)
                1 -> ImportTab(exportImportState, viewModel)
            }
        }
    }
}

@Composable
private fun ExportTab(
    state: com.upstyle.bizgrow.ui.state.ExportImportState,
    viewModel: AppViewModel
) {
    var dataType by remember { mutableStateOf("products") }
    var format by remember { mutableStateOf("excel") }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        // Data type selection
        Text("Tipe Data", fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("products" to "Produk", "finance" to "Keuangan", "customers" to "Pelanggan").forEach { (key, label) ->
                FilterChip(
                    selected = dataType == key,
                    onClick = { dataType = key },
                    label = { Text(label, fontSize = 12.sp) }
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // Format selection
        Text("Format", fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("excel" to "Excel", "csv" to "CSV", "pdf" to "PDF").forEach { (key, label) ->
                FilterChip(
                    selected = format == key,
                    onClick = { format = key },
                    label = { Text(label, fontSize = 12.sp) }
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // Progress
        if (state.exportProgress > 0f && state.exportProgress < 1f) {
            LinearProgressIndicator(progress = { state.exportProgress }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
        }

        // Success message
        state.successMessage?.let {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(8.dp))
                    Text(it, style = MaterialTheme.typography.bodySmall)
                }
            }
            Spacer(Modifier.height(8.dp))
        }

        // Error
        state.error?.let {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Text(it, modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer)
            }
            Spacer(Modifier.height(8.dp))
        }

        Button(
            onClick = { viewModel.exportData(dataType, format) },
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.isLoading
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
            }
            Icon(Icons.Default.Download, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Export Data")
        }

        // Link unduhan dari server (berlaku 10 menit) — dibuka di browser HP
        state.lastExportResult?.downloadUrl?.let { url ->
            val uriHandler = LocalUriHandler.current
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = { uriHandler.openUri(url) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.OpenInBrowser, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Unduh ${state.lastExportResult?.fileName ?: "file"}")
            }
        }

        Spacer(Modifier.height(16.dp))

        // Export history
        if (state.exportHistory.isNotEmpty()) {
            Text("Riwayat Export", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items(state.exportHistory) { item ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.InsertDriveFile, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.dataType, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                                Text("${item.format} • ${item.recordCount} data • ${item.createdAt}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(kotlin.io.encoding.ExperimentalEncodingApi::class)
@Composable
private fun ImportTab(
    state: com.upstyle.bizgrow.ui.state.ExportImportState,
    viewModel: AppViewModel
) {
    var dataType by remember { mutableStateOf("products") }
    var file by remember { mutableStateOf<FileTerpilih?>(null) }
    var galatFile by remember { mutableStateOf<String?>(null) }
    val base64 = remember(file) { file?.let { kotlin.io.encoding.Base64.encode(it.bytes) } }

    val pilihFile = rememberPemilihFile { f, galat ->
        galatFile = galat
        if (f != null) {
            file = f
            viewModel.clearExportImportMessages()
            viewModel.validateImportFile(dataType, kotlin.io.encoding.Base64.encode(f.bytes), f.nama)
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text("Tipe Data", fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("products" to "Produk", "customers" to "Pelanggan").forEach { (key, label) ->
                FilterChip(selected = dataType == key, onClick = {
                    dataType = key
                    // tipe berubah → validasi ulang file yang sama
                    file?.let { viewModel.validateImportFile(key, kotlin.io.encoding.Base64.encode(it.bytes), it.nama) }
                }, label = { Text(label, fontSize = 12.sp) })
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(
            if (dataType == "products") "Baris pertama = judul kolom: nama, sku, harga_beli, harga_jual, stok, kategori, jenis (kolom nama wajib)."
            else "Baris pertama = judul kolom: nama, telepon, email, perusahaan (kolom nama wajib).",
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(Modifier.height(16.dp))

        OutlinedButton(onClick = pilihFile, modifier = Modifier.fillMaxWidth(), enabled = !state.isLoading) {
            Icon(Icons.Default.Upload, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text(if (file == null) "Pilih File (Excel/CSV)" else "Ganti File")
        }
        file?.let {
            Spacer(Modifier.height(6.dp))
            Text("${it.nama} • ${it.bytes.size / 1024} KB", style = MaterialTheme.typography.labelMedium)
        }
        galatFile?.let {
            Spacer(Modifier.height(6.dp))
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }

        state.validationResult?.let { validation ->
            Spacer(Modifier.height(12.dp))
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (validation.isValid) MaterialTheme.colorScheme.primaryContainer
                                     else MaterialTheme.colorScheme.errorContainer
                )
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        if (validation.isValid) "File valid: ${validation.rowCount} baris ditemukan"
                        else "File tidak valid",
                        fontWeight = FontWeight.Medium,
                        color = if (validation.isValid) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onErrorContainer
                    )
                    validation.errors.take(8).forEach { err ->
                        Text("• $err", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer)
                    }
                    if (validation.errors.size > 8) Text("… dan ${validation.errors.size - 8} catatan lain", style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        state.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(8.dp))
        }

        state.lastImportResult?.let { result ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Import selesai", fontWeight = FontWeight.Medium)
                    Text("${result.importedCount} berhasil, ${result.failedCount} gagal", style = MaterialTheme.typography.bodySmall)
                    result.errors.take(5).forEach { Text("• $it", style = MaterialTheme.typography.bodySmall) }
                }
            }
            Spacer(Modifier.height(8.dp))
        }

        Button(
            onClick = { val f = file; val b = base64; if (f != null && b != null) viewModel.importData(dataType, b, f.nama) },
            modifier = Modifier.fillMaxWidth(),
            enabled = file != null && state.validationResult?.isValid == true && !state.isLoading
        ) {
            Text(if (state.isLoading) "Memproses…" else "Import Data")
        }
    }
}
