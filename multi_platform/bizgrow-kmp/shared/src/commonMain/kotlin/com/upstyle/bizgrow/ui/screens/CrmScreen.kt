package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/** Pusat CRM: deal, kontak, aktivitas, dan tugas follow-up dalam satu layar. */
@Composable
fun CrmScreen(viewModel: AppViewModel) {
    var tab by remember { mutableStateOf(0) }
    val tabs = listOf("Deal", "Kontak", "Aktivitas", "Tugas")
    val deals by viewModel.crmDeals.collectAsState(initial = viewModel.crmDeals.value)
    val kontak by viewModel.crmContacts.collectAsState(initial = viewModel.crmContacts.value)
    val aktivitas by viewModel.crmActivities.collectAsState(initial = viewModel.crmActivities.value)
    val tugas by viewModel.crmTasks.collectAsState(initial = viewModel.crmTasks.value)
    val memuat by viewModel.crmMemuat.collectAsState(initial = false)
    val dialogs = remember { CrmDialogs() }

    LaunchedEffect(Unit) { viewModel.muatSemuaCrm() }

    val terbuka = deals.filter { it.status == "open" }
    val menang = deals.filter { it.status == "won" }

    BizScreen(
        title = "CRM",
        subtitle = "${deals.size} deal • ${kontak.size} kontak",
        onBack = { viewModel.navigateBack() },
        actions = {
            BizIconButton(Icons.Rounded.ViewKanban, "Pipeline") { viewModel.navigate(Screen.CrmPipeline) }
            BizIconButton(Icons.Rounded.Description, "Penawaran") { viewModel.navigate(Screen.Quotations) }
            BizIconButton(Icons.Rounded.ShoppingCart, "Sales order") { viewModel.navigate(Screen.SalesOrders) }
            BizIconButton(Icons.Rounded.Refresh, "Muat ulang") { viewModel.muatSemuaCrm() }
        },
        floatingActionButton = {
            when (tab) {
                0 -> FabTambah("Deal") { dialogs.dealBaru = true }
                1 -> FabTambah("Kontak") { dialogs.kontakBaru = true }
                2 -> FabTambah("Aktivitas") { dialogs.aktivitasUntuk = null; dialogs.aktivitasBaru = true }
                else -> FabTambah("Tugas") { dialogs.tugasBaru = true }
            }
        },
        bottomBar = { BottomNavBar(viewModel, Screen.Crm) }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile("Pipeline terbuka", terbuka.sumOf { it.dealValue }.rupiahRingkas(), Icons.Rounded.TrendingUp, BizgrowColors.Info, Modifier.weight(1f), caption = "${terbuka.size} deal")
                StatTile("Deal menang", menang.sumOf { it.dealValue }.rupiahRingkas(), Icons.Rounded.EmojiEvents, BizgrowColors.Success, Modifier.weight(1f), caption = "${menang.size} deal")
            }
            TabRow(selectedTabIndex = tab, containerColor = MaterialTheme.colorScheme.background) {
                tabs.forEachIndexed { i, t -> Tab(selected = tab == i, onClick = { tab = i }, text = { Text(t) }) }
            }
            val isi = Modifier.fillMaxSize()
            when (tab) {
                0 -> DaftarDeal(deals, memuat, { dialogs.deal = it }, { dialogs.dealBaru = true }, isi)
                1 -> DaftarKontak(kontak, memuat, { dialogs.kontak = it }, { dialogs.kontakBaru = true }, isi)
                2 -> DaftarAktivitas(aktivitas, { dialogs.aktivitasUntuk = null; dialogs.aktivitasBaru = true }, isi)
                else -> DaftarTugas(
                    tugas, memuat,
                    onToggle = { viewModel.ubahTugasCrm(it.id, status = if (it.status == "done") "pending" else "done") },
                    onHapus = { viewModel.hapusTugasCrm(it.id) },
                    onTambah = { dialogs.tugasBaru = true }, modifier = isi
                )
            }
        }
    }
    CrmDialogHost(viewModel, dialogs)
}
