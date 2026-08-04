package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.ChatMessage
import com.upstyle.bizgrow.ui.AppViewModel
import kotlinx.coroutines.launch

enum class AiTab { CHAT, FINANCIAL_ADVISOR, WA_REPORT }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiChatScreen(viewModel: AppViewModel) {
    val chatHistory by viewModel.chatHistory.collectAsStateWithLifecycle()
    val isLoading by viewModel.isChatLoading.collectAsStateWithLifecycle()
    val units by viewModel.units.collectAsStateWithLifecycle()
    val activeUnitId by viewModel.activeUnitId.collectAsStateWithLifecycle()

    var currentTab by remember { mutableStateOf(AiTab.CHAT) }
    var inputText by remember { mutableStateOf("") }
    var showUnitPicker by remember { mutableStateOf(false) }
    var currentSuggestions by remember { mutableStateOf<List<String>>(emptyList()) }

    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(chatHistory.size) {
        if (chatHistory.isNotEmpty()) {
            coroutineScope.launch {
                listState.animateScrollToItem(chatHistory.lastIndex)
            }
            // Extract suggestions from last AI response
            val lastAiMsg = chatHistory.lastOrNull { it.role == "assistant" }
            // Suggestions would come from API response; for now placeholder
            currentSuggestions = emptyList()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("AI Assistant")
                        Text(
                            text = units.find { it.id == activeUnitId }?.nama ?: "Pilih Unit",
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
        bottomBar = { BottomNavBar(viewModel, AppViewModel.Screen.AiChatScreen) }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // Tabs
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
                    suggestions = currentSuggestions,
                    onSuggestionClick = { suggestion -> inputText = suggestion },
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
                onSelect = { viewModel.setActiveUnit(it); showUnitPicker = false }
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
    suggestions: List<String>,
    onSuggestionClick: (String) -> Unit,
    listState: androidx.compose.foundation.lazy.LazyListState
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // Suggestions row
        if (suggestions.isNotEmpty()) {
            LazyRow(
                modifier = Modifier.fillMaxWidth().padding(8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(suggestions) { suggestion ->
                    SuggestionChip(
                        onClick = { onSuggestionClick(suggestion) },
                        label = { Text(suggestion, style = MaterialTheme.typography.bodySmall) }
                    )
                }
            }
        }

        // Chat messages
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

            items(chatHistory) { msg ->
                ChatBubble(msg)
            }

            if (isLoading) {
                item {
                    Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        repeat(3) {
                            Box(
                                modifier = Modifier.size(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary)
                            )
                        }
                    }
                }
            }
        }

        // Input row
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
                topStart = 16.dp,
                topEnd = 16.dp,
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
    var period by remember { mutableStateOf("month") }
    var analysisResult by remember { mutableStateOf("") }
    var isAnalyzing by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Analisis Keuangan AI", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("AI akan menganalisis data keuangan Anda dan memberikan insight serta rekomendasi.", style = MaterialTheme.typography.bodySmall)

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = period == "week",
                        onClick = { period = "week" },
                        label = { Text("Minggu Ini") }
                    )
                    FilterChip(
                        selected = period == "month",
                        onClick = { period = "month" },
                        label = { Text("Bulan Ini") }
                    )
                    FilterChip(
                        selected = period == "year",
                        onClick = { period = "year" },
                        label = { Text("Tahun Ini") }
                    )
                }

                Button(
                    onClick = {
                        isAnalyzing = true
                        // TODO: call viewModel.analyzeFinancial(period) { result -> analysisResult = result; isAnalyzing = false }
                        analysisResult = "Analisis AI akan ditampilkan di sini.\n\nKeuangan Anda dalam kondisi sehat dengan revenue yang stabil.\n\nRekomendasi: Tingkatkan pemasaran digital untuk meningkatkan penjualan 15%."
                        isAnalyzing = false
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isAnalyzing
                ) {
                    if (isAnalyzing) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                    else Text("Analisis Sekarang")
                }
            }
        }

        if (analysisResult.isNotBlank()) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Hasil Analisis", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Text(analysisResult, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@Composable
fun WaReportTab(viewModel: AppViewModel) {
    var reportType by remember { mutableStateOf("daily") }
    var reportResult by remember { mutableStateOf("") }
    var isGenerating by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Generate Laporan WhatsApp", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("AI akan membuat laporan otomatis yang siap dikirim ke grup WhatsApp.", style = MaterialTheme.typography.bodySmall)

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = reportType == "daily",
                        onClick = { reportType = "daily" },
                        label = { Text("Harian") }
                    )
                    FilterChip(
                        selected = reportType == "weekly",
                        onClick = { reportType = "weekly" },
                        label = { Text("Mingguan") }
                    )
                    FilterChip(
                        selected = reportType == "monthly",
                        onClick = { reportType = "monthly" },
                        label = { Text("Bulanan") }
                    )
                }

                Button(
                    onClick = {
                        isGenerating = true
                        // TODO: call viewModel.generateWaReport(reportType) { result -> reportResult = result; isGenerating = false }
                        reportResult = "📊 *Laporan Harian Bizgrow*\n\n✅ Total Penjualan: Rp 2.500.000\n📦 Jumlah Transaksi: 15\n💰 Profit Bersih: Rp 800.000\n\n🔥 Produk Terlaris: Kopi Susu (8 pcs)\n\n_Generated by Bizgrow AI_"
                        isGenerating = false
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isGenerating
                ) {
                    if (isGenerating) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                    else Text("Generate Laporan")
                }
            }
        }

        if (reportResult.isNotBlank()) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Laporan Siap Kirim", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        IconButton(onClick = { /* TODO: Copy to clipboard */ }) {
                            Icon(Icons.Default.ContentCopy, "Copy")
                        }
                    }
                    Text(reportResult, style = MaterialTheme.typography.bodyMedium)
                    Button(onClick = { /* TODO: Share via WhatsApp */ }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.Share, "Share", modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Kirim via WhatsApp")
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
                            Text(unit.nama, fontWeight = if (unit.id == selectedId) FontWeight.Bold else FontWeight.Normal)
                            if (unit.id == selectedId) {
                                Icon(Icons.Default.Check, "Selected", tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Tutup") }
        }
    )
}
