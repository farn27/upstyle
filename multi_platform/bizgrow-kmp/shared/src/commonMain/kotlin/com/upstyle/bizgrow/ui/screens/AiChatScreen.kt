package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.ChatMessage
import com.upstyle.bizgrow.data.BusinessUnit
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.AppViewModel
import kotlinx.coroutines.launch

enum class AiTab { CHAT, FINANCIAL_ADVISOR, WA_REPORT }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiChatScreen(viewModel: AppViewModel) {
    val chatHistory by viewModel.chatHistory.collectAsState(initial = viewModel.chatHistory.value)
    val isLoading by viewModel.isChatLoading.collectAsState(initial = viewModel.isChatLoading.value)
    val units by viewModel.units.collectAsState(initial = viewModel.units.value)
    val activeUnitId by viewModel.activeUnitId.collectAsState(initial = viewModel.activeUnitId.value)

    var currentTab by remember { mutableStateOf(AiTab.CHAT) }
    var inputText by remember { mutableStateOf("") }
    var showUnitPicker by remember { mutableStateOf(false) }

    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(chatHistory.size) {
        if (chatHistory.isNotEmpty()) {
            coroutineScope.launch {
                listState.animateScrollToItem(chatHistory.lastIndex)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("AI Assistant")
                        Text(
                            text = units.find { it.id == activeUnitId }?.name ?: "Pilih Unit",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                ),
                actions = {
                    IconButton(onClick = { showUnitPicker = true }) {
                        Icon(Icons.Default.SwapHoriz, "Switch Unit", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                    IconButton(onClick = { viewModel.clearChat() }) {
                        Icon(Icons.Default.Delete, "Clear Chat", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                }
            )
        },
        bottomBar = { BottomNavBar(viewModel, Screen.AiChat) }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            TabRow(selectedTabIndex = currentTab.ordinal, containerColor = MaterialTheme.colorScheme.surfaceVariant) {
                Tab(selected = currentTab == AiTab.CHAT, onClick = { currentTab = AiTab.CHAT }, text = { Text("Chat") })
                Tab(selected = currentTab == AiTab.FINANCIAL_ADVISOR, onClick = { currentTab = AiTab.FINANCIAL_ADVISOR }, text = { Text("Financial Advisor") })
                Tab(selected = currentTab == AiTab.WA_REPORT, onClick = { currentTab = AiTab.WA_REPORT }, text = { Text("Laporan WA") })
            }

            when (currentTab) {
                AiTab.CHAT -> ChatTabContent(
                    chatHistory = chatHistory,
                    isLoading = isLoading,
                    inputText = inputText,
                    onInputChange = { inputText = it },
                    onSend = {
                        if (inputText.isNotBlank()) {
                            viewModel.sendChat(inputText)
                            inputText = ""
                        }
                    },
                    listState = listState
                )
                AiTab.FINANCIAL_ADVISOR -> FinancialAdvisorTab(viewModel)
                AiTab.WA_REPORT -> WaReportTab(viewModel)
            }
        }

        if (showUnitPicker) {
            UnitPickerDialog(
                units = units,
                selectedId = activeUnitId,
                onDismiss = { showUnitPicker = false },
                onSelect = { viewModel.selectUnit(it); showUnitPicker = false }
            )
        }
    }
}

@Composable
fun ChatTabContent(
    chatHistory: List<ChatMessage>,
    isLoading: Boolean,
    inputText: String,
    onInputChange: (String) -> Unit,
    onSend: () -> Unit,
    listState: androidx.compose.foundation.lazy.LazyListState
) {
    Column(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 12.dp),
            state = listState,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (chatHistory.isEmpty()) {
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Chat,
                            contentDescription = "AI Chat",
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            "Tanyakan apa saja tentang bisnis Anda",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            "AI akan membantu analisis keuangan, prediksi, dan saran bisnis",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            items(chatHistory) { msg -> ChatBubble(msg) }

            if (isLoading) {
                item {
                    Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        repeat(3) {
                            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
                        }
                    }
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = inputText,
                onValueChange = onInputChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Ketik pesan...") },
                shape = RoundedCornerShape(24.dp),
                maxLines = 3
            )
            FloatingActionButton(
                onClick = onSend,
                modifier = Modifier.size(48.dp),
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Send, "Send", tint = MaterialTheme.colorScheme.onPrimary)
            }
        }
    }
}

@Composable
fun ChatBubble(message: ChatMessage) {
    val isUser = message.role == "user"
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Card(
            modifier = Modifier.widthIn(max = 280.dp),
            shape = RoundedCornerShape(
                topStart = 16.dp, topEnd = 16.dp,
                bottomStart = if (isUser) 16.dp else 4.dp,
                bottomEnd = if (isUser) 4.dp else 16.dp
            ),
            colors = CardDefaults.cardColors(
                containerColor = if (isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Text(
                text = message.content,
                modifier = Modifier.padding(12.dp),
                style = MaterialTheme.typography.bodyMedium,
                color = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

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

@Composable
fun UnitPickerDialog(
    units: List<BusinessUnit>,
    selectedId: Int,
    onDismiss: () -> Unit,
    onSelect: (Int) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Pilih Unit Bisnis") },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(units) { unit ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { onSelect(unit.id) },
                        colors = CardDefaults.cardColors(
                            containerColor = if (unit.id == selectedId) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
                        )
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(unit.name, fontWeight = if (unit.id == selectedId) FontWeight.Bold else FontWeight.Normal)
                            if (unit.id == selectedId) {
                                Icon(Icons.Default.Check, "Selected", tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Tutup") } }
    )
}
