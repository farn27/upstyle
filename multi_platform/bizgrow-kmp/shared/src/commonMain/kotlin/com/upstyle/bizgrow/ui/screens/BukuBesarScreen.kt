package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.coroutines.launch
import kotlinx.datetime.*

@OptIn(ExperimentalMaterial3Api::class)
/** Buku Besar: mutasi satu akun per periode dengan saldo awal, saldo berjalan, dan saldo akhir (setara web). */
@Composable
fun BukuBesarScreen(viewModel: AppViewModel) {
    val akun by viewModel.chartOfAccounts.collectAsState(initial = viewModel.chartOfAccounts.value)
    val data by viewModel.bukuBesarData.collectAsState(initial = viewModel.bukuBesarData.value)
    val hari = remember { Clock.System.now().toLocalDateTime(TimeZone.of("Asia/Jakarta")).date }
    var coaId by remember { mutableStateOf<Int?>(null) }
    var tahun by remember { mutableStateOf(hari.year) }
    var bulan by remember { mutableStateOf<Int?>(null) }
    var memuat by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun muat() {
        val id = coaId ?: return
        scope.launch { memuat = true; viewModel.loadBukuBesar(id, tahun, bulan).join(); memuat = false }
    }
    LaunchedEffect(Unit) { viewModel.loadChartOfAccounts() }
    LaunchedEffect(coaId, tahun, bulan) { muat() }

    val dipilih = akun.firstOrNull { it.id == coaId }
    val debitNormal = (data?.coa?.normalBalance ?: dipilih?.normalBalance ?: "DEBIT") == "DEBIT"

    BizScreen(title = "Buku besar", subtitle = "Mutasi saldo tiap akun", onBack = { viewModel.navigateBack() }) { padding ->
        PullToRefreshBox(memuat, { muat() }, Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    PilihanField(
                        "Akun perkiraan", akun.filter { it.isActive == 1 }.map { it.id.toString() to "${it.kodeAkun} • ${it.namaAkun}" },
                        coaId?.toString(), { coaId = it.toIntOrNull() }, placeholder = "Pilih akun…"
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterPill("Sepanjang tahun", bulan == null, { bulan = null })
                        listOf("Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des").forEachIndexed { i, n -> FilterPill(n, bulan == i + 1, { bulan = i + 1 }) }
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        (0..2).map { hari.year - it }.forEach { th -> FilterPill("$th", tahun == th, { tahun = th }) }
                    }
                }
                if (dipilih == null) {
                    item { EmptyView("Pilih akun terlebih dahulu", "Pilih akun di atas untuk melihat detail mutasi, debit, kredit, dan saldo berjalan.", Icons.Rounded.MenuBook) }
                } else {
                    val d = data?.takeIf { (it.coa?.id ?: it.account?.id) == dipilih.id }
                    item {
                        BizSurface(Modifier.fillMaxWidth()) {
                            Text("${dipilih.kodeAkun} • ${dipilih.namaAkun}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text("Saldo normal: ${if (debitNormal) "DEBIT" else "KREDIT"}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(10.dp))
                            Row {
                                Column(Modifier.weight(1f)) {
                                    Text("Saldo awal", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text((d?.saldoAwal ?: 0.0).rupiah(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                }
                                Column(Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                                    Text("Saldo akhir", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text((d?.saldoAkhir ?: 0.0).rupiah(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = BizgrowColors.Primary)
                                }
                            }
                            HorizontalDivider(Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.outlineVariant)
                            Row {
                                Column(Modifier.weight(1f)) {
                                    Text("Total debit", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text((d?.totalDebit ?: 0.0).rupiah(), style = MaterialTheme.typography.bodyMedium, color = BizgrowColors.Success, fontWeight = FontWeight.SemiBold)
                                }
                                Column(Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                                    Text("Total kredit", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text((d?.totalKredit ?: 0.0).rupiah(), style = MaterialTheme.typography.bodyMedium, color = BizgrowColors.Danger, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }
                    if (d == null) {
                        item { if (memuat) SkeletonList(rows = 4) }
                    } else if (d.entries.isEmpty()) {
                        item { EmptyView("Tidak ada mutasi", "Akun ini belum punya jurnal pada periode yang dipilih.", Icons.Rounded.Inbox) }
                    } else {
                        itemsIndexed(d.entries) { i, e ->
                            val debit = e.debit > 0
                            ListRow(
                                title = e.keterangan.ifBlank { e.nomorJurnal.ifBlank { "Jurnal" } },
                                subtitle = listOfNotNull(
                                    runCatching { LocalDate.parse(e.tanggal.take(10)) }.getOrNull()?.let { "${it.dayOfMonth} ${namaBulanPendek(it.monthNumber)} ${it.year}" } ?: e.tanggal,
                                    e.nomorJurnal.takeIf { it.isNotBlank() },
                                    e.referensi?.takeIf { it.isNotBlank() }?.let { "Ref $it" }
                                ).joinToString(" • "),
                                icon = if (debit) Icons.Rounded.SouthWest else Icons.Rounded.NorthEast,
                                tint = if (debit) BizgrowColors.Success else BizgrowColors.Danger,
                                modifier = Modifier.enterAnimation(i),
                                trailing = {
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text((if (debit) "+ " else "− ") + (if (debit) e.debit else e.kredit).rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = if (debit) BizgrowColors.Success else BizgrowColors.Danger)
                                        Text("Saldo ${e.saldo.rupiahRingkas()}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
