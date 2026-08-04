package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.MarketingLead
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.components.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MarketingScreen(viewModel: AppViewModel) {
    val marketingData by viewModel.marketingData.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Leads", "Kampanye")
    var showCreateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { 
        viewModel.loadMarketingData()
        viewModel.loadMarketingCampaigns()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text("Marketing Center", fontWeight = FontWeight.Bold)
                        marketingData?.summary?.let {
                            Text("${it.totalLeads} leads • ${it.convertedLeads} konversi", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                },
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        },
        floatingActionButton = {
            if (selectedTab == 0) {
                FloatingActionButton(onClick = { showCreateDialog = true }, containerColor = BizgrowColors.Primary) {
                    Icon(Icons.Default.PersonAdd, "Tambah Lead", tint = Color.White)
                }
            }
        },
        bottomBar = { BottomNavBar(viewModel, com.upstyle.bizgrow.ui.Screen.Marketing) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(selected = selectedTab == index, onClick = { selectedTab = index }, text = { Text(title) })
                }
            }

            when (selectedTab) {
                0 -> LeadsTab(marketingData?.leads ?: emptyList(), viewModel, uiState.isLoading)
                1 -> CampaignsTab(marketingData?.campaigns ?: emptyList())
            }
        }
    }

    if (showCreateDialog) {
        CreateLeadDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { nama, email, telepon, source ->
                viewModel.createMarketingLead(nama, email, telepon, source)
                showCreateDialog = false
            }
        )
    }
}

@Composable
fun LeadsTab(leads: List<MarketingLead>, viewModel: AppViewModel, isLoading: Boolean) {
    if (isLoading && leads.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
    } else if (leads.isEmpty()) {
        EmptyState(Icons.Default.PersonAdd, "Belum ada leads", "Tambah leads untuk mulai marketing")
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(leads, key = { it.id }) { lead ->
                LeadCard(lead = lead, onUpdateStatus = { viewModel.updateLeadStatus(it, lead.status) })
            }
        }
    }
}

@Composable
fun CampaignsTab(campaigns: List<com.upstyle.bizgrow.data.MarketingCampaign>) {
    if (campaigns.isEmpty()) {
        EmptyState(Icons.Default.Campaign, "Belum ada kampanye", "Buat kampanye marketing pertama Anda")
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(campaigns, key = { it.id }) { campaign ->
                BizCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Campaign, null, tint = BizgrowColors.Primary, modifier = Modifier.size(32.dp))
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(campaign.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("${campaign.type} • Budget: ${campaign.budget.toRupiah()}", fontSize = 12.sp, color = BizgrowColors.Gray500)
                        }
                        StatusBadge(campaign.status.uppercase())
                    }
                }
            }
        }
    }
}

@Composable
fun LeadCard(lead: MarketingLead, onUpdateStatus: (Int) -> Unit) {
    BizCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(lead.nama, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                if (lead.email.isNotEmpty()) Text(lead.email, fontSize = 12.sp, color = BizgrowColors.Gray500)
                if (lead.telepon.isNotEmpty()) Text(lead.telepon, fontSize = 12.sp, color = BizgrowColors.Gray500)
                Spacer(Modifier.height(4.dp))
                Text("Sumber: ${lead.source}", fontSize = 11.sp, color = BizgrowColors.Primary)
                if (lead.notes?.isNotEmpty() == true) {
                    Spacer(Modifier.height(4.dp))
                    Text(lead.notes!!, fontSize = 12.sp, color = BizgrowColors.Gray600)
                }
            }
            StatusBadge(lead.status.uppercase())
        }
    }
}

@Composable
fun CreateLeadDialog(
    onDismiss: () -> Unit,
    onCreate: (String, String, String, String) -> Unit
) {
    var nama by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var telepon by remember { mutableStateOf("") }
    var source by remember { mutableStateOf("organic") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Lead Baru", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = nama, onValueChange = { nama = it },
                    label = { Text("Nama *") }, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = email, onValueChange = { email = it },
                    label = { Text("Email") }, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = telepon, onValueChange = { telepon = it },
                    label = { Text("Telepon") }, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = source, onValueChange = { source = it },
                    label = { Text("Sumber (organic/ads/referral/social)") }, modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { if (nama.isNotBlank()) onCreate(nama, email, telepon, source) },
                enabled = nama.isNotBlank()
            ) { Text("Simpan") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Batal") } }
    )
}