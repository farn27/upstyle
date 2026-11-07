package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*

/** Pipeline kanban: kolom per tahap, ketuk kartu untuk memindahkan / mengubah. */
@Composable
fun CrmPipelineScreen(viewModel: AppViewModel) {
    val deals by viewModel.crmDeals.collectAsState(initial = viewModel.crmDeals.value)
    val dialogs = remember { CrmDialogs() }
    LaunchedEffect(Unit) { viewModel.loadCrmData() }

    BizScreen(
        title = "Pipeline CRM", subtitle = "${deals.size} deal", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Deal") { dialogs.dealBaru = true } }
    ) { padding ->
        LazyRow(
            Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(TAHAP_DEAL, key = { it.first }) { (id, label) ->
                val isi = deals.filter { it.stage.uppercase() == id }
                val warna = warnaTahap(id)
                Column(Modifier.width(290.dp).fillMaxHeight()) {
                    BizSurface(Modifier.fillMaxWidth().padding(bottom = 10.dp), contentPadding = PaddingValues(14.dp)) {
                        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                            Text(label, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                            StatusChip("${isi.size}", warna)
                        }
                        Text(isi.sumOf { it.dealValue }.rupiah(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (isi.isEmpty()) {
                        Text("Belum ada deal", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(8.dp))
                    }
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(isi, key = { it.id }) { d -> KartuDeal(d) { dialogs.deal = d } }
                    }
                }
            }
        }
    }
    CrmDialogHost(viewModel, dialogs)
}
