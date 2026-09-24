package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.ChartOfAccount
import com.upstyle.bizgrow.data.Product
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import kotlinx.coroutines.launch

/**
 * Layar entri transaksi lengkap dengan:
 * - NLP AI input (prosesAI) yang mengisi form otomatis
 * - Dropdown COA berdasarkan tipe Masuk/Keluar
 * - Dropdown akun kas dari COA tipe ASET_LANCAR
 * - AI Kategori suggestion chip dengan debounce
 * - Validasi form sebelum simpan
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionEntryScreen(viewModel: AppViewModel) {
    // ─── Observe ViewModel state ──────────────────────────────────────────────
    val products by viewModel.products.collectAsState()
    val chartOfAccounts by viewModel.chartOfAccounts.collectAsState()
    val kasAccounts by viewModel.kasAccounts.collectAsState()
    val hasCoa by viewModel.hasCoa.collectAsState()
    val isAiEntryLoading by viewModel.isAiEntryLoading.collectAsState()
    val aiEntryResult by viewModel.aiEntryResult.collectAsState()
    val aiKategoriSuggestion by viewModel.aiKategoriSuggestion.collectAsState()
    val uiState by viewModel.uiState.collectAsState()

    // ─── Local form state ─────────────────────────────────────────────────────
    var nlpText by remember { mutableStateOf("") }
    var tipeTrx by remember { mutableStateOf("Masuk") }  // "Masuk" | "Keluar"
    var selectedCoa by remember { mutableStateOf<ChartOfAccount?>(null) }
    var selectedKasCoa by remember { mutableStateOf<ChartOfAccount?>(null) }
    var selectedProduct by remember { mutableStateOf<Product?>(null) }
    var qty by remember { mutableStateOf("1") }
    var nominal by remember { mutableStateOf("") }
    var keterangan by remember { mutableStateOf("") }
    var selectedAbcId by remember { mutableStateOf<Int?>(null) }

    // Dropdown expand states
    var showTipeMenu by remember { mutableStateOf(false) }
    var showCoaMenu by remember { mutableStateOf(false) }
    var showKasMenu by remember { mutableStateOf(false) }
    var showProductMenu by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    // ─── COA filtered berdasarkan tipe transaksi ──────────────────────────────
    val filteredCoa = remember(chartOfAccounts, tipeTrx) {
        chartOfAccounts.filter { coa ->
            if (tipeTrx == "Masuk") {
                coa.tipeAkun.equals("PENDAPATAN", ignoreCase = true) ||
                coa.tipeAkun.equals("PENDAPATAN_LAINNYA", ignoreCase = true)
            } else {
                coa.tipeAkun.equals("BEBAN_OPERASIONAL", ignoreCase = true) ||
                coa.tipeAkun.equals("BEBAN_LAINNYA", ignoreCase = true) ||
                coa.tipeAkun.equals("HPP", ignoreCase = true)
            }
        }
    }

    // ─── Auto-fill form dari AI entry result ──────────────────────────────────
    LaunchedEffect(aiEntryResult) {
        val result = aiEntryResult ?: return@LaunchedEffect
        tipeTrx = if (result.kategori.equals("Masuk", ignoreCase = true)) "Masuk" else "Keluar"
        nominal = if (result.nominal > 0) result.nominal.toLong().toString() else ""
        keterangan = result.catatan.ifBlank { keterangan }
        qty = result.qty.toString()

        // Cari dan set produk jika ada
        if (!result.productId.isNullOrBlank()) {
            selectedProduct = products.find { it.id == result.productId }
        }

        // Set COA — cari dari chartOfAccounts
        result.coaId?.let { coaId ->
            selectedCoa = chartOfAccounts.find { it.id == coaId }
        }
        result.kasCoaId?.let { kasId ->
            selectedKasCoa = kasAccounts.find { it.id == kasId }
                ?: chartOfAccounts.find { it.id == kasId }
        }

        // Default kas account jika AI tidak berhasil identify
        if (selectedKasCoa == null && kasAccounts.isNotEmpty()) {
            selectedKasCoa = kasAccounts.first()
        }

        coroutineScope.launch {
            snackbarHostState.showSnackbar("AI Sinkron! Form sudah diisi otomatis.")
        }
        viewModel.clearAiEntryResult()
    }

    // ─── Hitung nominal otomatis saat produk/qty berubah ─────────────────────
    LaunchedEffect(selectedProduct, qty, tipeTrx) {
        val p = selectedProduct ?: return@LaunchedEffect
        val q = qty.toIntOrNull() ?: 1
        val harga = if (tipeTrx == "Masuk") p.hargaJual else p.hargaBeli
        nominal = (harga * q).toLong().toString()
    }

    // ─── Reset form saat tipe berubah ─────────────────────────────────────────
    fun resetFormForTipe() {
        selectedCoa = null
        selectedProduct = null
        nominal = ""
        qty = "1"
        keterangan = ""
        selectedAbcId = null
    }

    // ─── Load data saat screen pertama kali muncul ───────────────────────────
    LaunchedEffect(Unit) {
        viewModel.loadProducts()
        viewModel.loadChartOfAccounts()
    }

    // ─── Validasi submit ──────────────────────────────────────────────────────
    val nominalDouble = nominal.toDoubleOrNull() ?: 0.0
    val canSubmit = selectedCoa != null && selectedKasCoa != null && nominalDouble > 0 && !uiState.isLoading

    // ─── UI ───────────────────────────────────────────────────────────────────
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Entri Transaksi", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, "Kembali")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {

            // ─── NLP AI Input Card ────────────────────────────────────────────
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                        Text("Entri dengan AI", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                    }
                    OutlinedTextField(
                        value = nlpText,
                        onValueChange = { nlpText = it },
                        placeholder = { Text("Ketik transaksi... (contoh: jual kopi 3 cup)", style = MaterialTheme.typography.bodySmall) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        enabled = !isAiEntryLoading,
                        maxLines = 3
                    )
                    Button(
                        onClick = { viewModel.prosesAI(nlpText) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = nlpText.length >= 5 && !isAiEntryLoading,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isAiEntryLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("Memproses AI...")
                        } else {
                            Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Proses AI")
                        }
                    }
                }
            }

            // ─── AI Kategori Suggestion Chip ──────────────────────────────────
            aiKategoriSuggestion?.let { suggestion ->
                if (suggestion.confidence >= 60) {
                    // Lookup nama kategori (tampilkan abc_id jika nama tidak tersedia)
                    val chipLabel = "Kategori disarankan (${suggestion.confidence}%)"
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        SuggestionChip(
                            onClick = { selectedAbcId = suggestion.abc_id },
                            label = { Text(chipLabel, fontSize = 12.sp) },
                            icon = { Icon(Icons.Default.Lightbulb, null, modifier = Modifier.size(14.dp)) }
                        )
                        Text(
                            suggestion.reason,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // ─── No COA Warning ───────────────────────────────────────────────
            if (!hasCoa) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("COA belum di-setup", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFFE65100))
                            Text("Chart of Accounts diperlukan untuk entri transaksi double-entry.", style = MaterialTheme.typography.bodySmall, color = Color(0xFFBF360C))
                        }
                        TextButton(onClick = { viewModel.navigate(Screen.Coa) }) {
                            Text("Setup COA")
                        }
                    }
                }
            }

            // ─── Form Fields ──────────────────────────────────────────────────
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Detail Transaksi", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)

                    // Tipe Masuk/Keluar
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Masuk", "Keluar").forEach { tipe ->
                            val isSel = tipeTrx == tipe
                            val color = if (tipe == "Masuk") Color(0xFF22C55E) else Color(0xFFEF4444)
                            FilterChip(
                                selected = isSel,
                                onClick = {
                                    tipeTrx = tipe
                                    resetFormForTipe()
                                },
                                label = { Text(tipe, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal) },
                                modifier = Modifier.weight(1f),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = color.copy(alpha = 0.15f),
                                    selectedLabelColor = color
                                )
                            )
                        }
                    }

                    // COA Dropdown
                    ExposedDropdownMenuBox(
                        expanded = showCoaMenu,
                        onExpandedChange = { if (hasCoa) showCoaMenu = it }
                    ) {
                        OutlinedTextField(
                            value = selectedCoa?.let { "${it.kodeAkun} - ${it.namaAkun}" } ?: "",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Akun COA *") },
                            placeholder = { Text(if (!hasCoa) "Setup COA dulu" else "Pilih akun...") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = showCoaMenu) },
                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                            shape = RoundedCornerShape(12.dp),
                            enabled = hasCoa
                        )
                        ExposedDropdownMenu(expanded = showCoaMenu, onDismissRequest = { showCoaMenu = false }) {
                            filteredCoa.forEach { coa ->
                                DropdownMenuItem(
                                    text = { Text("${coa.kodeAkun} - ${coa.namaAkun}", fontSize = 14.sp) },
                                    onClick = { selectedCoa = coa; showCoaMenu = false }
                                )
                            }
                            if (filteredCoa.isEmpty()) {
                                DropdownMenuItem(
                                    text = { Text("Tidak ada akun untuk tipe $tipeTrx", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp) },
                                    onClick = { showCoaMenu = false }
                                )
                            }
                        }
                    }

                    // Akun Kas/Bank Dropdown
                    ExposedDropdownMenuBox(
                        expanded = showKasMenu,
                        onExpandedChange = { if (kasAccounts.isNotEmpty()) showKasMenu = it }
                    ) {
                        OutlinedTextField(
                            value = selectedKasCoa?.namaAkun ?: "",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Akun Kas/Bank *") },
                            placeholder = { Text("Pilih metode bayar...") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = showKasMenu) },
                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                            shape = RoundedCornerShape(12.dp),
                            enabled = kasAccounts.isNotEmpty()
                        )
                        ExposedDropdownMenu(expanded = showKasMenu, onDismissRequest = { showKasMenu = false }) {
                            kasAccounts.forEach { kas ->
                                DropdownMenuItem(
                                    text = { Text(kas.namaAkun, fontSize = 14.sp) },
                                    onClick = { selectedKasCoa = kas; showKasMenu = false }
                                )
                            }
                        }
                    }

                    // Produk (opsional)
                    ExposedDropdownMenuBox(
                        expanded = showProductMenu,
                        onExpandedChange = { if (products.isNotEmpty()) showProductMenu = it }
                    ) {
                        OutlinedTextField(
                            value = selectedProduct?.nama ?: "",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Produk (opsional)") },
                            placeholder = { Text("Pilih produk...") },
                            trailingIcon = {
                                Row {
                                    if (selectedProduct != null) {
                                        IconButton(onClick = { selectedProduct = null; nominal = "" }, modifier = Modifier.size(24.dp)) {
                                            Icon(Icons.Default.Close, null, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = showProductMenu)
                                }
                            },
                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                            shape = RoundedCornerShape(12.dp)
                        )
                        ExposedDropdownMenu(expanded = showProductMenu, onDismissRequest = { showProductMenu = false }) {
                            products.take(50).forEach { p ->
                                DropdownMenuItem(
                                    text = { Text("${p.nama} — Rp${"%,.0f".format(p.hargaJual)}", fontSize = 13.sp) },
                                    onClick = { selectedProduct = p; showProductMenu = false }
                                )
                            }
                        }
                    }

                    // Qty
                    OutlinedTextField(
                        value = qty,
                        onValueChange = { qty = it },
                        label = { Text("Qty") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )

                    // Nominal
                    OutlinedTextField(
                        value = nominal,
                        onValueChange = { nominal = it },
                        label = { Text("Nominal (Rp) *") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        leadingIcon = { Text("Rp", modifier = Modifier.padding(start = 12.dp), style = MaterialTheme.typography.bodyMedium) },
                        isError = nominalDouble <= 0 && nominal.isNotBlank()
                    )

                    // Keterangan — trigger AI Kategori debounce
                    OutlinedTextField(
                        value = keterangan,
                        onValueChange = {
                            keterangan = it
                            viewModel.onKeteranganChanged(it)
                        },
                        label = { Text("Keterangan") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        placeholder = { Text("Contoh: Penjualan ayam geprek...") }
                    )
                }
            }

            // ─── Tombol Simpan ────────────────────────────────────────────────
            Button(
                onClick = {
                    val coa = selectedCoa ?: return@Button
                    val kas = selectedKasCoa ?: return@Button
                    viewModel.createTransactionWithCoa(
                        kategoriTrx = tipeTrx,
                        nominal = nominalDouble,
                        keterangan = keterangan.ifBlank { nlpText },
                        coaId = coa.id,
                        kasCoaId = kas.id,
                        productId = selectedProduct?.id,
                        qty = qty.toIntOrNull() ?: 1,
                        abcCategoryId = selectedAbcId
                    )
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp),
                enabled = canSubmit
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("Menyimpan...")
                } else {
                    Icon(Icons.Default.Save, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Simpan Transaksi", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }

            // Info validasi
            if (!canSubmit && !uiState.isLoading) {
                val missingFields = buildList {
                    if (selectedCoa == null) add("COA")
                    if (selectedKasCoa == null) add("akun kas/bank")
                    if (nominalDouble <= 0) add("nominal > 0")
                }
                if (missingFields.isNotEmpty()) {
                    Text(
                        "Wajib isi: ${missingFields.joinToString(", ")}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}
