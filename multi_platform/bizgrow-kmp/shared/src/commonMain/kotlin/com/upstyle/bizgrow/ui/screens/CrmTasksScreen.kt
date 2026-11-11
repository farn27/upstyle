package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*

/** Tugas CRM & follow-up: tambah, centang selesai, hapus. */
@Composable
fun CrmTasksScreen(viewModel: AppViewModel) {
    val tugas by viewModel.crmTasks.collectAsState(initial = viewModel.crmTasks.value)
    val memuat by viewModel.crmMemuat.collectAsState(initial = false)
    val dialogs = remember { CrmDialogs() }
    LaunchedEffect(Unit) { viewModel.loadCrmTasks(); viewModel.loadCrmData() }

    BizScreen(
        title = "Tugas CRM", subtitle = "${tugas.count { it.status != "done" }} tugas terbuka", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Tugas") { dialogs.tugasBaru = true } }
    ) { padding ->
        DaftarTugas(
            tugas, memuat,
            onToggle = { viewModel.ubahTugasCrm(it.id, status = if (it.status == "done") "pending" else "done") },
            onHapus = { viewModel.hapusTugasCrm(it.id) },
            onTambah = { dialogs.tugasBaru = true }, modifier = Modifier.fillMaxSize().padding(padding)
        )
    }
    CrmDialogHost(viewModel, dialogs)
}
