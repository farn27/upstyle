package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.upstyle.bizgrow.data.HelpArticle
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.components.BizCard
import com.upstyle.bizgrow.ui.components.BottomNavBar
import com.upstyle.bizgrow.ui.components.EmptyState
import com.upstyle.bizgrow.ui.components.ErrorState
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HelpCenterScreen(viewModel: AppViewModel) {
    val state by viewModel.helpState.collectAsState()
    
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var expandedFaqId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { viewModel.loadHelpArticles() }

    val categories = state.articles.map { it.category }.distinct()
    val filteredArticles = state.articles.filter {
        val matchSearch = it.title.contains(searchQuery, ignoreCase = true) ||
                it.content.contains(searchQuery, ignoreCase = true)
        val matchCategory = selectedCategory == null || it.category == selectedCategory
        matchSearch && matchCategory
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pusat Bantuan", fontWeight = FontWeight.Bold, color = BizgrowColors.Gray900) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = BizgrowColors.Gray900)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BizgrowColors.Surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.navigate(Screen.Notifications) },
                containerColor = BizgrowColors.Primary,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp),
                elevation = FloatingActionButtonDefaults.elevation(2.dp)
            ) {
                Icon(Icons.Default.CheckCircle, contentDescription = "Feedback")
            }
        },
        bottomBar = { BottomNavBar(viewModel, Screen.HelpCenter) }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Cari pertanyaan...", color = BizgrowColors.Gray400) },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = BizgrowColors.Gray400) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                shape = RoundedCornerShape(20.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BizgrowColors.Primary,
                    unfocusedBorderColor = BizgrowColors.Gray200,
                    focusedContainerColor = BizgrowColors.White,
                    unfocusedContainerColor = BizgrowColors.White
                )
            )

            LazyRow(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    CategoryChip("Semua", selectedCategory == null) { selectedCategory = null }
                }
                items(categories) { category ->
                    CategoryChip(category, selectedCategory == category) { selectedCategory = category }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (state.isLoading && state.articles.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BizgrowColors.Primary)
                }
            } else if (state.error != null && state.articles.isEmpty()) {
                ErrorState(message = state.error ?: "Gagal memuat", onRetry = { viewModel.loadHelpArticles() })
            } else if (filteredArticles.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.HelpOutline,
                    title = if (searchQuery.isNotEmpty()) "Tidak ada FAQ" else "Belum ada FAQ",
                    subtitle = if (searchQuery.isNotEmpty()) "Coba kata kunci lain" else "FAQ akan ditampilkan di sini"
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredArticles, key = { it.id }) { faq ->
                        FaqItem(
                            faq = faq,
                            isExpanded = expandedFaqId == faq.id,
                            onToggle = {
                                expandedFaqId = if (expandedFaqId == faq.id) null else faq.id
                                if (expandedFaqId == faq.id) viewModel.markFaqViewed(faq.id)
                            },
                            onHelpful = { viewModel.submitFaqFeedback(faq.id, true) },
                            onNotHelpful = { viewModel.submitFaqFeedback(faq.id, false) }
                        )
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }
}

@Composable
fun FaqItem(
    faq: HelpArticle,
    isExpanded: Boolean,
    onToggle: () -> Unit,
    onHelpful: () -> Unit,
    onNotHelpful: () -> Unit
) {
    BizCard {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().clickable(onClick = onToggle),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = BizgrowColors.PrimaryLight
                        ) {
                            Text(
                                text = faq.category,
                                style = MaterialTheme.typography.labelSmall,
                                color = BizgrowColors.Primary,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                        Text(faq.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = BizgrowColors.Gray950)
                    }
                }
                Icon(
                    imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    tint = BizgrowColors.Gray500
                )
            }
            if (isExpanded) {
                HorizontalDivider(color = BizgrowColors.Gray200)
                Text(faq.content, style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray800)
                Spacer(modifier = Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Apakah ini membantu?", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray600)
                    TextButton(onClick = onHelpful) {
                        Icon(Icons.Default.SentimentSatisfied, null, modifier = Modifier.size(18.dp), tint = BizgrowColors.Success)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Ya", color = BizgrowColors.Success)
                    }
                    TextButton(onClick = onNotHelpful) {
                        Icon(Icons.Default.SentimentDissatisfied, null, modifier = Modifier.size(18.dp), tint = BizgrowColors.Danger)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Tidak", color = BizgrowColors.Danger)
                    }
                }
            }
        }
    }
}

@Composable
fun CategoryChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = if (selected) BizgrowColors.Primary else BizgrowColors.White,
        contentColor = if (selected) Color.White else BizgrowColors.Gray700,
        border = if (!selected) androidx.compose.foundation.BorderStroke(1.dp, BizgrowColors.Gray200) else null,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            fontSize = 13.sp
        )
    }
}
