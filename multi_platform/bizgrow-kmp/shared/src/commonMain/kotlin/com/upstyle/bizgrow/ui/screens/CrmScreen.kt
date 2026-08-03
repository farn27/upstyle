package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.components.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CrmScreen(viewModel: AppViewModel) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Deals", "Kontak", "Aktivitas")
    val deals by viewModel.crmDeals.collectAsStateWithLifecycle()
    val contacts by viewModel.crmContacts.collectAsStateWithLifecycle()
    val activities by viewModel.crmActivities.collectAsStateWithLifecycle()
    var showAddDeal by remember { mutableStateOf(false) }
    var showAddContact by remember { mutableStateOf(false) }
    var showAddActivity by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadCrmData(); viewModel.loadCrmActivities() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("CRM", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } },
                actions = {
                    IconButton(onClick = { viewModel.navigate(Screen.Quotations) }) { Icon(Icons.Default.Description, contentDescription = "Penawaran") }
                    IconButton(onClick = { viewModel.navigate(Screen.SalesOrders) }) { Icon(Icons.Default.ShoppingCart, contentDescription = "Sales Orders") }
                    IconButton(onClick = { viewModel.navigate(Screen.CrmTasks) }) { Icon(Icons.Default.Assignment, contentDescription = "Tugas CRM") }
                    IconButton(onClick = { viewModel.navigate(Screen.CrmPipeline) }) { Icon(Icons.Default.ViewKanban, contentDescription = "Pipeline") }
                }
            )
        },
        floatingActionButton = {
            when (selectedTab) {
                0 -> FloatingActionButton(onClick = { showAddDeal = true }) { Icon(Icons.Default.Add, null) }
                1 -> FloatingActionButton(onClick = { showAddContact = true }) { Icon(Icons.Default.PersonAdd, null) }
                2 -> FloatingActionButton(onClick = { showAddActivity = true }) { Icon(Icons.Default.Add, null) }
            }
        },
        bottomBar = { BottomNavBar(viewModel, Screen.Crm) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {

            // Summary stats
            Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCard("Total Deals", "${deals.size}", icon = Icons.Default.Contacts, gradient = BizgrowColors.GradPrimary, modifier = Modifier.weight(1f))
                StatCard("Pipeline", "Rp ${"%,.0f".format(deals.filter { it.status == "open" }.sumOf { it.dealValue })}", icon = Icons.Default.TrendingUp, gradient = BizgrowColors.GradSuccess, modifier = Modifier.weight(1.4f))
            }

            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { i, t -> Tab(selected = selectedTab == i, onClick = { selectedTab = i }, text = { Text(t) }) }
            }

            when (selectedTab) {
                0 -> DealsTab(deals, onStageChange = { id, stage -> viewModel.updateDealStage(id, stage) }, onDelete = { viewModel.deleteDeal(it) })
                1 -> ContactsTab(contacts)
                2 -> ActivitiesTab(activities)
            }
        }
    }

    if (showAddDeal) AddDealSheet(onDismiss = { showAddDeal = false }) { contactName, companyName, dealValue, stage, phone ->
        viewModel.createDeal(contactName, companyName, dealValue, stage, phone)
        showAddDeal = false
    }

    if (showAddContact) AddContactSheet(onDismiss = { showAddContact = false }) { nama, telepon, email, perusahaan, stage ->
        viewModel.createContact(nama, telepon, email, perusahaan, stage)
        showAddContact = false
    }

    if (showAddActivity) AddActivitySheet(contacts = contacts, onDismiss = { showAddActivity = false }) { kontakId, tipe, catatan ->
        // viewModel.createActivity(...)
        showAddActivity = false
    }
}

@Composable
fun DealsTab(deals: List<CrmDeal>, onStageChange: (Int, String) -> Unit, onDelete: (Int) -> Unit) {
    val stages = listOf("PROSPECT", "PROPOSAL", "NEGOTIATION", "WON", "LOST")
    if (deals.isEmpty()) { EmptyState(Icons.Default.Contacts, "Belum ada deals", "Tambah deal pertama"); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(deals, key = { it.id }) { deal ->
            BizCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(44.dp).clip(CircleShape)
                            .background(Brush.linearGradient(BizgrowColors.GradPrimary)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(deal.contactName.first().toString(), color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(deal.contactName, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(deal.companyName, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(deal.dealValue.toRupiah(), style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Success, fontWeight = FontWeight.Bold)
                    }
                    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        StatusBadge(deal.stage)
                        IconButton(onClick = { onDelete(deal.id) }, modifier = Modifier.size(28.dp)) {
                            Icon(Icons.Default.DeleteOutline, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
                // Stage changer
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(stages) { stage ->
                        val isCurrent = deal.stage.equals(stage, ignoreCase = true)
                        FilterChip(
                            selected = isCurrent,
                            onClick = { if (!isCurrent) onStageChange(deal.id, stage) },
                            label = { Text(stage, style = MaterialTheme.typography.labelSmall) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = if (stage == "WON") BizgrowColors.SuccessLight
                                else if (stage == "LOST") BizgrowColors.DangerLight
                                else MaterialTheme.colorScheme.primaryContainer
                            )
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ContactsTab(contacts: List<CrmContact>) {
    if (contacts.isEmpty()) { EmptyState(Icons.Default.People, "Belum ada kontak"); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(contacts, key = { it.id }) { contact ->
            BizCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(44.dp).clip(CircleShape).background(BizgrowColors.PrimaryLight),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(contact.nama.first().toString(), color = BizgrowColors.Primary, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(contact.nama, fontWeight = FontWeight.SemiBold)
                        if (contact.perusahaan.isNotEmpty()) Text(contact.perusahaan, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (contact.telepon.isNotEmpty()) Text(contact.telepon, style = MaterialTheme.typography.bodySmall)
                    }
                    StatusBadge(contact.stage)
                }
            }
        }
    }
}

@Composable
fun ActivitiesTab(activities: List<CrmActivity>) {
    val activityIcons = mapOf(
        "Call" to Icons.Default.Phone, "WA" to Icons.Default.Chat,
        "Meeting" to Icons.Default.People, "Email" to Icons.Default.Email,
        "Task" to Icons.Default.Task
    )
    if (activities.isEmpty()) { EmptyState(Icons.Default.Event, "Belum ada aktivitas"); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(activities, key = { it.id }) { act ->
            BizCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(40.dp).clip(CircleShape).background(BizgrowColors.PrimaryLight),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(activityIcons[act.tipe] ?: Icons.Default.Event, null, tint = BizgrowColors.Primary, modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(act.tipe, fontWeight = FontWeight.SemiBold)
                        act.catatan?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        act.contact?.let { Text(it.nama, style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Primary) }
                    }
                    Text(act.tanggal.take(10), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

// ─── Sheets ───────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddDealSheet(onDismiss: () -> Unit, onSave: (String, String, Double, String, String) -> Unit) {
    var contactName by remember { mutableStateOf("") }
    var companyName by remember { mutableStateOf("") }
    var dealValue by remember { mutableStateOf("") }
    var stage by remember { mutableStateOf("PROSPECT") }
    var phone by remember { mutableStateOf("") }
    val stages = listOf("PROSPECT", "PROPOSAL", "NEGOTIATION", "WON")

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Tambah Deal Baru", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            OutlinedTextField(contactName, { contactName = it }, label = { Text("Nama Kontak *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp))
            OutlinedTextField(companyName, { companyName = it }, label = { Text("Perusahaan") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(dealValue, { dealValue = it }, label = { Text("Nilai Deal (Rp)") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                OutlinedTextField(phone, { phone = it }, label = { Text("Telepon") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp))
            }
            Text("Stage", style = MaterialTheme.typography.labelMedium)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(stages) { s -> FilterChip(selected = stage == s, onClick = { stage = s }, label = { Text(s) }) }
            }
            Button(
                onClick = { if (contactName.isNotBlank()) onSave(contactName, companyName, dealValue.toDoubleOrNull() ?: 0.0, stage, phone) },
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(20.dp)
            ) { Text("Simpan Deal", fontWeight = FontWeight.Bold) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddContactSheet(onDismiss: () -> Unit, onSave: (String, String, String, String, String) -> Unit) {
    var nama by remember { mutableStateOf("") }
    var telepon by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var perusahaan by remember { mutableStateOf("") }
    var stage by remember { mutableStateOf("lead") }
    val stages = listOf("lead", "prospect", "customer", "vip")

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Tambah Kontak", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            OutlinedTextField(nama, { nama = it }, label = { Text("Nama *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(telepon, { telepon = it }, label = { Text("Telepon") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp))
                OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp))
            }
            OutlinedTextField(perusahaan, { perusahaan = it }, label = { Text("Perusahaan") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp))
            Text("Stage", style = MaterialTheme.typography.labelMedium)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(stages) { s -> FilterChip(selected = stage == s, onClick = { stage = s }, label = { Text(s.replaceFirstChar { it.uppercase() }) }) }
            }
            Button(
                onClick = { if (nama.isNotBlank()) onSave(nama, telepon, email, perusahaan, stage) },
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(20.dp)
            ) { Text("Simpan Kontak", fontWeight = FontWeight.Bold) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddActivitySheet(contacts: List<CrmContact>, onDismiss: () -> Unit, onSave: (Int, String, String) -> Unit) {
    var selectedContactId by remember { mutableStateOf<Int?>(null) }
    var tipe by remember { mutableStateOf("Call") }
    var catatan by remember { mutableStateOf("") }
    var expandedContact by remember { mutableStateOf(false) }
    val tipes = listOf("Call", "WA", "Meeting", "Email", "Task")
    val selectedContact = contacts.find { it.id == selectedContactId }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Log Aktivitas", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            ExposedDropdownMenuBox(expandedContact, { expandedContact = it }) {
                OutlinedTextField(
                    value = selectedContact?.nama ?: "Pilih Kontak",
                    onValueChange = {}, readOnly = true,
                    label = { Text("Kontak") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expandedContact) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(), shape = RoundedCornerShape(20.dp)
                )
                ExposedDropdownMenu(expandedContact, { expandedContact = false }) {
                    contacts.forEach { c -> DropdownMenuItem(text = { Text(c.nama) }, onClick = { selectedContactId = c.id; expandedContact = false }) }
                }
            }
            Text("Tipe Aktivitas", style = MaterialTheme.typography.labelMedium)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(tipes) { t -> FilterChip(selected = tipe == t, onClick = { tipe = t }, label = { Text(t) }) }
            }
            OutlinedTextField(catatan, { catatan = it }, label = { Text("Catatan") }, modifier = Modifier.fillMaxWidth().height(100.dp), shape = RoundedCornerShape(20.dp), maxLines = 3)
            Button(
                onClick = { if (selectedContactId != null) onSave(selectedContactId!!, tipe, catatan) },
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(20.dp)
            ) { Text("Simpan Aktivitas", fontWeight = FontWeight.Bold) }
        }
    }
}
