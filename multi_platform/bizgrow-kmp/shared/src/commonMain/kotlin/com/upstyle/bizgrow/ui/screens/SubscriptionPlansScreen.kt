package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.border
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
import com.upstyle.bizgrow.data.SubscriptionPlan
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionPlansScreen(viewModel: AppViewModel) {
    val subscriptionState by viewModel.subscriptionState.collectAsState()
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Paket", "Penggunaan", "Invoice")

    LaunchedEffect(Unit) {
        viewModel.loadSubscriptionPlans()
        viewModel.loadCurrentSubscription()
        viewModel.loadUsageMetrics()
        viewModel.loadInvoices()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Langganan", fontWeight = FontWeight.Bold) },
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
                tabs.forEachIndexed { i, t -> Tab(selected = selectedTab == i, onClick = { selectedTab = i }, text = { Text(t) }) }
            }
            when (selectedTab) {
                0 -> PlansTab(subscriptionState.plans, subscriptionState.currentSubscription?.planId, viewModel)
                1 -> UsageTab(subscriptionState.usageMetrics)
                2 -> InvoicesTab(subscriptionState.invoices)
            }
        }
    }
}

@Composable
private fun PlansTab(plans: List<SubscriptionPlan>, currentPlanId: String?, viewModel: AppViewModel) {
    if (plans.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items(plans) { plan ->
            val isCurrent = plan.id == currentPlanId
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .then(if (isCurrent) Modifier.border(2.dp, MaterialTheme.colorScheme.primary, MaterialTheme.shapes.medium) else Modifier)
                    .clickable(enabled = !isCurrent) { viewModel.navigate(Screen.PlanUpgrade) },
                colors = CardDefaults.cardColors(
                    containerColor = if (isCurrent) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                                     else MaterialTheme.colorScheme.surface
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(plan.name, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
                        if (isCurrent) {
                            Surface(color = MaterialTheme.colorScheme.primary, shape = MaterialTheme.shapes.small) {
                                Text("Aktif", modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), color = MaterialTheme.colorScheme.onPrimary, fontSize = 11.sp)
                            }
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    Text("Rp ${plan.priceMonthly.toLong()} / bulan", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    plan.features.forEach { feature ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 2.dp)) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                            Spacer(Modifier.width(6.dp))
                            Text(feature, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    if (!isCurrent) {
                        Spacer(Modifier.height(12.dp))
                        Button(onClick = { viewModel.navigate(Screen.PlanUpgrade) }, modifier = Modifier.fillMaxWidth()) {
                            Text("Pilih Paket Ini")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun UsageTab(metrics: com.upstyle.bizgrow.data.UsageMetrics?) {
    if (metrics == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            UsageItem("Produk", metrics.productCount, metrics.maxProducts)
            Spacer(Modifier.height(12.dp))
            UsageItem("Pengguna", metrics.userCount, metrics.maxUsers)
            Spacer(Modifier.height(12.dp))
            UsageItem("Storage", (metrics.storageUsedMb / 1024).toInt(), (metrics.maxStorageMb / 1024).toInt(), unit = "GB")
        }
    }
}

@Composable
private fun UsageItem(label: String, used: Int, max: Int, unit: String = "") {
    val pct = if (max > 0) used.toFloat() / max else 0f
    Column {
        Row(modifier = Modifier.fillMaxWidth()) {
            Text(label, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
            Text("$used / $max $unit".trim(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { pct.coerceIn(0f, 1f) },
            modifier = Modifier.fillMaxWidth(),
            color = if (pct >= 0.8f) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
        )
        if (pct >= 0.8f) {
            Spacer(Modifier.height(2.dp))
            Text("⚠️ Mendekati batas paket", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun InvoicesTab(invoices: List<com.upstyle.bizgrow.data.Invoice>) {
    if (invoices.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Belum ada invoice", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(invoices) { invoice ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Invoice #${invoice.id}", fontWeight = FontWeight.Medium)
                        Text("Rp ${invoice.amount.toLong()} • ${invoice.issuedDate}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Surface(
                        color = if (invoice.status == "paid") MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer,
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text(
                            if (invoice.status == "paid") "Lunas" else "Belum Bayar",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            fontSize = 11.sp,
                            color = if (invoice.status == "paid") MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
            }
        }
    }
}
