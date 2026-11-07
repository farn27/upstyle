package com.upstyle.bizgrow.ui.design

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import com.upstyle.bizgrow.ui.theme.LocalBizPalette
import kotlinx.datetime.*

// Kit formulir seragam untuk layar CRUD (aset, pajak, anggaran, COA, kontak, dll).

/** Lembar formulir: judul + isi bisa digulir + tombol Simpan/Hapus. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FormSheet(
    judul: String,
    onDismiss: () -> Unit,
    onSimpan: () -> Unit,
    modifier: Modifier = Modifier,
    subjudul: String? = null,
    labelSimpan: String = "Simpan",
    simpanAktif: Boolean = true,
    onHapus: (() -> Unit)? = null,
    isi: @Composable ColumnScope.() -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(modifier.fillMaxWidth().imePadding().navigationBarsPadding().padding(horizontal = 20.dp)) {
            Text(judul, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            if (subjudul != null) Text(subjudul, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(14.dp))
            Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp), content = isi)
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                if (onHapus != null) BizOutlineButton("Hapus", onClick = onHapus, icon = Icons.Rounded.DeleteOutline, tint = BizgrowColors.Danger)
                BizButton(labelSimpan, onClick = onSimpan, modifier = Modifier.weight(1f), enabled = simpanAktif, icon = Icons.Rounded.Check)
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

/** Field angka: hanya digit & titik/koma desimal. */
@Composable
fun AngkaField(nilai: String, onUbah: (String) -> Unit, label: String, placeholder: String? = null, desimal: Boolean = true, supporting: String? = null) {
    BizTextField(
        nilai, { v -> onUbah(v.filter { it.isDigit() || (desimal && (it == '.')) }) }, label,
        placeholder = placeholder, keyboardType = if (desimal) KeyboardType.Decimal else KeyboardType.Number, supportingText = supporting
    )
}

/** Pilihan dropdown (nilai → label). */
@Composable
fun PilihanField(label: String, pilihan: List<Pair<String, String>>, terpilih: String?, onPilih: (String) -> Unit, placeholder: String = "Pilih…", enabled: Boolean = true) {
    var buka by remember { mutableStateOf(false) }
    val aktif = pilihan.firstOrNull { it.first == terpilih }
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp, bottom = 4.dp))
        Box {
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, LocalBizPalette.current.border, RoundedCornerShape(16.dp))
                    .clickable(enabled = enabled) { buka = true }.padding(horizontal = 16.dp, vertical = 15.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    aktif?.second ?: placeholder, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f),
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                    color = if (aktif == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface
                )
                Icon(Icons.Rounded.UnfoldMore, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            DropdownMenu(expanded = buka, onDismissRequest = { buka = false }, modifier = Modifier.heightIn(max = 340.dp)) {
                if (pilihan.isEmpty()) DropdownMenuItem(text = { Text("Belum ada pilihan") }, onClick = { buka = false })
                pilihan.forEach { (nilai, teks) ->
                    DropdownMenuItem(
                        text = { Text(teks) },
                        trailingIcon = { if (nilai == terpilih) Icon(Icons.Rounded.Check, null, tint = BizgrowColors.Primary) },
                        onClick = { buka = false; onPilih(nilai) }
                    )
                }
            }
        }
    }
}

/** Pilihan beberapa opsi sebagai pil (untuk 2-4 pilihan). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PilihanPil(label: String, pilihan: List<Pair<String, String>>, terpilih: String?, onPilih: (String) -> Unit) {
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp, bottom = 6.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            pilihan.forEach { (nilai, teks) -> FilterPill(teks, terpilih == nilai, { onPilih(nilai) }) }
        }
    }
}

/** Field tanggal dengan pemilih tanggal (nilai format YYYY-MM-DD). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TanggalField(label: String, nilai: String, onUbah: (String) -> Unit) {
    var buka by remember { mutableStateOf(false) }
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp, bottom = 4.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface)
                .border(1.dp, LocalBizPalette.current.border, RoundedCornerShape(16.dp))
                .clickable { buka = true }.padding(horizontal = 16.dp, vertical = 15.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(nilai.ifBlank { "Pilih tanggal" }, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f),
                color = if (nilai.isBlank()) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
            Icon(Icons.Rounded.CalendarMonth, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
    if (buka) {
        val awal = runCatching { LocalDate.parse(nilai).atStartOfDayIn(TimeZone.UTC).toEpochMilliseconds() }.getOrNull()
        val state = rememberDatePickerState(initialSelectedDateMillis = awal)
        DatePickerDialog(
            onDismissRequest = { buka = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { onUbah(Instant.fromEpochMilliseconds(it).toLocalDateTime(TimeZone.UTC).date.toString()) }
                    buka = false
                }) { Text("Pilih") }
            },
            dismissButton = { TextButton(onClick = { buka = false }) { Text("Batal") } }
        ) { DatePicker(state = state) }
    }
}

@Composable
fun SwitchBaris(label: String, deskripsi: String? = null, nilai: Boolean, onUbah: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
            if (deskripsi != null) Text(deskripsi, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = nilai, onCheckedChange = onUbah)
    }
}

/** Dialog konfirmasi hapus. */
@Composable
fun KonfirmasiHapus(judul: String, pesan: String, onYa: () -> Unit, onBatal: () -> Unit) {
    AlertDialog(
        onDismissRequest = onBatal,
        shape = RoundedCornerShape(24.dp),
        containerColor = MaterialTheme.colorScheme.surface,
        icon = { IconBadge(Icons.Rounded.DeleteOutline, BizgrowColors.Danger) },
        title = { Text(judul) },
        text = { Text(pesan) },
        confirmButton = { TextButton(onClick = onYa) { Text("Hapus", color = BizgrowColors.Danger, fontWeight = FontWeight.Bold) } },
        dismissButton = { TextButton(onClick = onBatal) { Text("Batal") } }
    )
}

/** Tombol tambah mengambang seragam. */
@Composable
fun FabTambah(label: String, onClick: () -> Unit) {
    ExtendedFloatingActionButton(
        onClick = onClick,
        containerColor = MaterialTheme.colorScheme.primary,
        contentColor = MaterialTheme.colorScheme.onPrimary,
        shape = RoundedCornerShape(18.dp),
        icon = { Icon(Icons.Rounded.Add, null) },
        text = { Text(label, fontWeight = FontWeight.Bold) }
    )
}
