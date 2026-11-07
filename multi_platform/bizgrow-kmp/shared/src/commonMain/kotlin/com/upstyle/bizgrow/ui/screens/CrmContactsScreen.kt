package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*

/** Kontak CRM (daftar penuh + detail + tambah / ubah / hapus). */
@Composable
fun CrmContactsScreen(viewModel: AppViewModel) {
    val kontak by viewModel.crmContacts.collectAsState(initial = viewModel.crmContacts.value)
    val memuat by viewModel.crmMemuat.collectAsState(initial = false)
    val dialogs = remember { CrmDialogs() }
    LaunchedEffect(Unit) { viewModel.loadCrmData(); viewModel.loadCrmActivities() }

    BizScreen(
        title = "Kontak CRM", subtitle = "${kontak.size} kontak", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Kontak") { dialogs.kontakBaru = true } }
    ) { padding ->
        DaftarKontak(kontak, memuat, { dialogs.kontak = it }, { dialogs.kontakBaru = true }, Modifier.fillMaxSize().padding(padding))
    }
    CrmDialogHost(viewModel, dialogs)
}
