package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
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
import androidx.compose.ui.unit.sp
import com.upstyle.bizgrow.data.HelpArticle
import com.upstyle.bizgrow.data.HelpFaqItem
import com.upstyle.bizgrow.data.SupportTicket
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HelpCenterScreen(viewModel: AppViewModel) {
    val helpState by viewModel.helpState.collectAsState()
    val csState by viewModel.csState.collectAsState()
    var selectedTab by remember { mutableStateOf(0) }

    LaunchedEffect(Unit) {
        viewModel.loadContextualHelp("general")
        viewModel.loadHelpFaqs()
        viewModel.loadTickets()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pusat Bantuan", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.navigate(Screen.Diagnostics) }) {
                        Icon(Icons.Default.BugReport, contentDescription = "Diagnostik")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            TabRow(selectedTabIndex = selectedTab) {
                listOf("Bantuan", "FAQ", "Tiket").forEachIndexed { i, t ->
                    Tab(selected = selectedTab == i, onClick = { selectedTab = i }, text = { Text(t) })
                }
            }
            when (selectedTab) {
                0 -> BantuanTab(helpState.articles)
                1 -> FaqTab(helpState.faqs, helpState.searchResults, viewModel)
                2 -> TiketTab(csState.tickets, viewModel)
            }
        }
    }
}

@Composable
private fun BantuanTab(articles: List<HelpArticle>) {
    if (articles.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.HelpOutline,
                    contentDescription = null,
                    modifier = Modifier.size(56.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(8.dp))
                Text("Tidak ada artikel bantuan", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(articles) { article ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(article.title, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = article.content.take(100) + if (article.content.length > 100) "..." else "",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (article.tags.isNotEmpty()) {
                            Spacer(Modifier.height(6.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                article.tags.take(3).forEach { tag ->
                                    SuggestionChip(onClick = {}, label = { Text(tag, fontSize = 10.sp) })
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FaqTab(
    faqs: List<HelpFaqItem>,
    searchResults: List<HelpArticle>,
    viewModel: AppViewModel
) {
    var query by remember { mutableStateOf("") }
    Column(modifier = Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it; viewModel.searchHelp(it) },
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            placeholder = { Text("Cari bantuan...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            singleLine = true
        )
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            if (query.isBlank()) {
                items(faqs) { faq -> FaqItem(faq) }
            } else {
                items(searchResults) { article ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(article.title, fontWeight = FontWeight.Medium)
                            Text(
                                text = article.content.take(80) + if (article.content.length > 80) "..." else "",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FaqItem(faq: HelpFaqItem) {
    var expanded by remember { mutableStateOf(false) }
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded }
            .padding(bottom = 4.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(faq.question, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                Icon(
                    imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null
                )
            }
            if (expanded) {
                Spacer(Modifier.height(8.dp))
                Text(faq.answer, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun TiketTab(tickets: List<SupportTicket>, viewModel: AppViewModel) {
    Column(modifier = Modifier.fillMaxSize()) {
        Button(
            onClick = { viewModel.navigate(Screen.SupportTicketDetail(0)) },
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = null)
            Spacer(Modifier.width(4.dp))
            Text("Buat Tiket Baru")
        }
        if (tickets.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Belum ada tiket", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(tickets) { ticket ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.navigate(Screen.SupportTicketDetail(ticket.id)) }
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    ticket.subject,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.weight(1f)
                                )
                                val statusColor = when (ticket.status) {
                                    "open"        -> MaterialTheme.colorScheme.error
                                    "in_progress" -> MaterialTheme.colorScheme.tertiary
                                    else          -> MaterialTheme.colorScheme.primary
                                }
                                Surface(
                                    color = statusColor.copy(alpha = 0.15f),
                                    shape = MaterialTheme.shapes.small
                                ) {
                                    Text(
                                        ticket.status,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        fontSize = 10.sp,
                                        color = statusColor
                                    )
                                }
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "Prioritas: ${ticket.priority} • ${ticket.createdAt}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}
