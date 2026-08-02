package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.data.*
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CrmScreen(viewModel: AppViewModel) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Deals", "Kontak", "Aktivitas")
    val deals by viewModel.crmDeals.collectAsStateWithLifecycle()
    val contacts by viewModel.crmContacts.collectAsStateWithLifecycle()
    val activities by viewModel.crmActivities.collectAsStateWithLifecycle()
    
    var showAddDealSheet by remember { mutableStateOf(false) }
    var showAddContactSheet by remember { mutableStateOf(false) }
    var showAddActivitySheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadCrmData()
        viewModel.loadCrmActivities()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("CRM") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.navigate(Screen.CrmPipeline) }) {
                        Icon(Icons.Default.ViewKanban, contentDescription = "Pipeline View")
                    }
                }
            )
        },
        floatingActionButton = {
            when (selectedTab) {
                0 -> FloatingActionButton(onClick = { showAddDealSheet = true }) { Icon(Icons.Default.Add, "Tambah Deal") }
                1 -> FloatingActionButton(onClick = { showAddContactSheet = true }) { Icon(Icons.Default.Add, "Tambah Kontak") }
                2 -> FloatingActionButton(onClick = { showAddActivitySheet = true }) { Icon(Icons.Default.Add, "Log Aktivitas") }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) }
                    )
                }
            }
            
            when (selectedTab) {
                0 -> {
                    val totalDeals = deals.size
                    val totalValue = deals.sumOf { it.dealValue }
                    
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Total Deals: $totalDeals", fontWeight = FontWeight.Bold)
                        Text("Nilai: Rp ${"%,.0f".format(totalValue)}", fontWeight = FontWeight.Bold)
                    }
                    
                    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
                        items(deals) { deal ->
                            DealCardItem(deal = deal, onClick = {})
                            Spacer(Modifier.height(8.dp))
                        }
                        item {
                            Button(
                                onClick = { viewModel.navigate(Screen.CrmPipeline) },
                                modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp)
                            ) {
                                Text("Lihat Pipeline")
                            }
                        }
                    }
                }
                1 -> {
                    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                        items(contacts) { contact ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(contact.nama, fontWeight = FontWeight.Bold)
                                    Text(contact.perusahaan)
                                    Text(contact.telepon)
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                        }
                    }
                }
                2 -> {
                    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                        items(activities) { activity ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Event, contentDescription = null)
                                    Spacer(Modifier.width(8.dp))
                                    Column {
                                        Text(activity.catatan ?: "")
                                        Text(activity.tanggal, style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                        }
                    }
                }
            }
        }
        
        if (showAddDealSheet) {
            ModalBottomSheet(onDismissRequest = { showAddDealSheet = false }) {
                Column(Modifier.padding(16.dp)) {
                    Text("Tambah Deal", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(value = "", onValueChange = {}, label = { Text("Nama Kontak") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(value = "", onValueChange = {}, label = { Text("Perusahaan") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(value = "", onValueChange = {}, label = { Text("Nilai Deal") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { showAddDealSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Simpan") }
                    Spacer(Modifier.height(16.dp))
                }
            }
        }
        
        if (showAddContactSheet) {
            ModalBottomSheet(onDismissRequest = { showAddContactSheet = false }) {
                Column(Modifier.padding(16.dp)) {
                    Text("Tambah Kontak", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(value = "", onValueChange = {}, label = { Text("Nama") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(value = "", onValueChange = {}, label = { Text("Telepon") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { showAddContactSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Simpan") }
                    Spacer(Modifier.height(16.dp))
                }
            }
        }

        if (showAddActivitySheet) {
            ModalBottomSheet(onDismissRequest = { showAddActivitySheet = false }) {
                Column(Modifier.padding(16.dp)) {
                    Text("Log Aktivitas", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(value = "", onValueChange = {}, label = { Text("Catatan") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { showAddActivitySheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Simpan") }
                    Spacer(Modifier.height(16.dp))
                }
            }
        }
    }
}

@Composable
fun DealCardItem(deal: com.upstyle.bizgrow.data.CrmDeal, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(deal.contactName, fontWeight = FontWeight.Bold)
            Text(deal.companyName, style = MaterialTheme.typography.bodyMedium)
            Text("Rp ${"%,.0f".format(deal.dealValue)}", color = Color(0xFF2E7D32))
            Spacer(Modifier.height(8.dp))
            SuggestionChip(
                onClick = {},
                label = { Text(deal.stage) }
            )
        }
    }
}
