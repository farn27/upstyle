package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.BusinessPlan
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/** Daftar rencana bisnis (Business Planning): lanjutkan wizard, lihat status, hapus. Padanan finance/planning di web. */
@Composable
fun BusinessPlanScreen(viewModel: AppViewModel) {
    val state by viewModel.businessPlansState.collectAsState(initial = viewModel.businessPlansState.value)
    var hapus by remember { mutableStateOf<BusinessPlan?>(null) }

    LaunchedEffect(Unit) { viewModel.loadBusinessPlans() }

    BizScreen(
        title = "Business Planning", subtitle = "Panduan memulai bisnis, dibantu AI",
        onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Rencana baru") { viewModel.bukaWizardPlan(0) } }
    ) { padding ->
        when {
            state.isLoading && state.plans.isEmpty() -> SkeletonList(4, Modifier.padding(padding).padding(16.dp))
            state.error != null && state.plans.isEmpty() -> ErrorView(state.error ?: "Gagal memuat", { viewModel.loadBusinessPlans() }, Modifier.padding(padding))
            else -> LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item { PanduanPlan() }
                if (state.plans.isEmpty()) item {
                    EmptyView(
                        "Belum ada rencana bisnis", "Mulai dari nama bisnis, target pasar, sampai proyeksi modal. AI membantu mengisi dan memeriksa rencanamu.",
                        Icons.Rounded.Lightbulb, "Mulai sekarang", { viewModel.bukaWizardPlan(0) }
                    )
                }
                items(state.plans, key = { it.id }) { p -> KartuPlan(p, onBuka = { viewModel.bukaWizardPlan(p.id) }, onHapus = { hapus = p }) }
            }
        }
    }

    hapus?.let { p ->
        KonfirmasiHapus(
            "Hapus rencana \"${p.title}\"?", "Rencana dihapus permanen. Bisnis yang sudah dibuat dari rencana ini tidak ikut terhapus.",
            { viewModel.deleteBusinessPlan(p.id); hapus = null }, { hapus = null }
        )
    }
}

@Composable
internal fun PanduanPlan() {
    BizSurface(Modifier.fillMaxWidth(), color = BizgrowColors.Violet.copy(alpha = 0.08f), border = false) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AiAvatar(36.dp); Spacer(Modifier.width(12.dp))
            Column {
                Text("Cara kerjanya", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text("7 langkah: identitas → target pasar → nilai → pendapatan → modal → channel → konfirmasi AI. Setelah final, AI memeriksa rencanamu lalu membuatkan Business Canvas dan menyiapkan data bisnis otomatis.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun KartuPlan(p: BusinessPlan, onBuka: () -> Unit, onHapus: () -> Unit) {
    val (label, warna) = when {
        p.isSeeded || p.status == "APPLIED" -> "Diterapkan" to BizgrowColors.Success
        p.status == "COMPLETE" -> "Selesai" to BizgrowColors.Info
        else -> "Draf" to BizgrowColors.Warning
    }
    val langkah = p.currentStep.coerceIn(1, 7)
    BizSurface(Modifier.fillMaxWidth(), onClick = onBuka, contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(Icons.Rounded.Map, warna, size = 46.dp, iconSize = 22.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(p.title.ifBlank { "Rencana tanpa nama" }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(KategoriUsahaList.firstOrNull { it.kode == p.kategori }?.label ?: p.kategori, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            StatusChip(label, warna)
            BizIconButton(Icons.Rounded.DeleteOutline, "Hapus rencana", onClick = onHapus)
        }
        if (p.status != "APPLIED" && !p.isSeeded) {
            Spacer(Modifier.height(10.dp))
            LinearProgressIndicator(progress = { langkah / 7f }, modifier = Modifier.fillMaxWidth().height(6.dp).clip(androidx.compose.foundation.shape.CircleShape))
            Spacer(Modifier.height(4.dp))
            Text(if (p.status == "COMPLETE") "Siap diterapkan — ketuk untuk melihat canvas & menerapkan" else "Langkah $langkah dari 7 — ketuk untuk melanjutkan", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (p.executiveSummary.isNotBlank()) {
            Spacer(Modifier.height(6.dp))
            Text(p.executiveSummary, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
