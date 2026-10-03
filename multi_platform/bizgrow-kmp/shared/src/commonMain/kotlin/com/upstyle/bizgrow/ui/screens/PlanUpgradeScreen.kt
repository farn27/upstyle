package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanUpgradeScreen(viewModel: AppViewModel) {
    val subscriptionState by viewModel.subscriptionState.collectAsState()
    val billingState by viewModel.billingState.collectAsState()

    var selectedPlanId by remember { mutableStateOf("") }
    var selectedPaymentMethod by remember { mutableStateOf("credit_card") }
    var billingCycle by remember { mutableStateOf("monthly") }
    var step by remember { mutableStateOf(0) } // 0=pilih paket, 1=pembayaran, 2=konfirmasi

    LaunchedEffect(Unit) { viewModel.loadSubscriptionPlans() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Upgrade Paket", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, contentDescription = "Kembali") } }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp).fillMaxSize()) {
            // Step indicator
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                listOf("Pilih Paket", "Pembayaran", "Konfirmasi").forEachIndexed { i, label ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Surface(
                            color = if (i <= step) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                            shape = MaterialTheme.shapes.small
                        ) {
                            Text("${i+1}", modifier = Modifier.padding(8.dp), color = if (i <= step) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                        }
                        Text(label, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            when (step) {
                0 -> {
                    Text("Pilih Paket", fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    subscriptionState.plans.forEach { plan ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(selected = selectedPlanId == plan.id, onClick = { selectedPlanId = plan.id })
                            Spacer(Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(plan.name, fontWeight = FontWeight.Medium)
                                Text("Rp ${plan.priceMonthly.toLong()} / bulan", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    Button(onClick = { if (selectedPlanId.isNotEmpty()) step = 1 }, modifier = Modifier.fillMaxWidth(), enabled = selectedPlanId.isNotEmpty()) {
                        Text("Lanjut")
                    }
                }
                1 -> {
                    Text("Metode Pembayaran", fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    listOf("credit_card" to "Kartu Kredit/Debit", "bank_transfer" to "Transfer Bank", "google_pay" to "Google Pay").forEach { (method, label) ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = selectedPaymentMethod == method, onClick = { selectedPaymentMethod = method })
                            Spacer(Modifier.width(8.dp))
                            Text(label)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Text("Siklus Penagihan", fontWeight = FontWeight.Bold)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = billingCycle == "monthly", onClick = { billingCycle = "monthly" }, label = { Text("Bulanan") }, modifier = Modifier.weight(1f))
                        FilterChip(selected = billingCycle == "yearly", onClick = { billingCycle = "yearly" }, label = { Text("Tahunan (hemat 20%)") }, modifier = Modifier.weight(1f))
                    }
                    Spacer(Modifier.weight(1f))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(onClick = { step = 0 }, modifier = Modifier.weight(1f)) { Text("Kembali") }
                        Button(onClick = { step = 2 }, modifier = Modifier.weight(1f)) { Text("Lanjut") }
                    }
                }
                2 -> {
                    val plan = subscriptionState.plans.find { it.id == selectedPlanId }
                    Text("Konfirmasi Pembayaran", fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(16.dp))
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row { Text("Paket:", modifier = Modifier.weight(1f)); Text(plan?.name ?: "", fontWeight = FontWeight.Medium) }
                            Row { Text("Harga:", modifier = Modifier.weight(1f)); Text("Rp ${if (billingCycle == "monthly") plan?.priceMonthly?.toLong() else plan?.priceYearly?.toLong()} / ${if (billingCycle == "monthly") "bulan" else "tahun"}", fontWeight = FontWeight.Medium) }
                            Row { Text("Pembayaran:", modifier = Modifier.weight(1f)); Text(selectedPaymentMethod, fontWeight = FontWeight.Medium) }
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    if (billingState.error != null) {
                        Text(billingState.error ?: "", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(8.dp))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(onClick = { step = 1 }, modifier = Modifier.weight(1f)) { Text("Kembali") }
                        Button(
                            onClick = { viewModel.upgradePlan(selectedPlanId, selectedPaymentMethod, billingCycle) },
                            modifier = Modifier.weight(1f),
                            enabled = !billingState.isLoading
                        ) {
                            if (billingState.isLoading) CircularProgressIndicator(modifier = Modifier.size(16.dp))
                            else Text("Bayar Sekarang")
                        }
                    }
                }
            }
        }
    }
}
