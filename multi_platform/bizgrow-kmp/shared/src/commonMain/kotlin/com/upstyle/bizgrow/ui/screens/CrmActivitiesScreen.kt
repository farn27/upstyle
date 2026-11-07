package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*

/** Log aktivitas CRM (telepon, WA, meeting, email) + catat aktivitas baru. */
@Composable
fun CrmActivitiesScreen(viewModel: AppViewModel) {
    val aktivitas by viewModel.crmActivities.collectAsState(initial = viewModel.crmActivities.value)
    val dialogs = remember { CrmDialogs() }
    LaunchedEffect(Unit) { viewModel.loadCrmData(); viewModel.loadCrmActivities() }

    BizScreen(
        title = "Log aktivitas", subtitle = "${aktivitas.size} aktivitas terbaru", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Aktivitas") { dialogs.aktivitasUntuk = null; dialogs.aktivitasBaru = true } }
    ) { padding ->
        DaftarAktivitas(aktivitas, { dialogs.aktivitasBaru = true }, Modifier.fillMaxSize().padding(padding))
    }
    CrmDialogHost(viewModel, dialogs)
}
