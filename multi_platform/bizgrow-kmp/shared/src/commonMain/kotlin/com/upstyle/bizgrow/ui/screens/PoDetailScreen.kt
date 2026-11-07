package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material.icons.automirrored.rounded.Undo
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.datetime.*
import kotlinx.serialization.json.*

private enum class FormPo { TERIMA, TAGIH, RETUR, BATAL }

private fun JsonObjectBuilder.baris(items: List<PoItemDetail>, qty: Map<Int, String>) {
    put("items", buildJsonArray {
        items.forEach { i -> val q = qty[i.id]?.toIntOrNull() ?: 0; if (q > 0) add(buildJsonObject { put("itemId", i.id); put("qty", q) }) }
    })
}

/** Detail Purchase Order: barang, penerimaan, tagihan (hutang), retur — aturan stok & jurnal sama dengan web. */
@Composable
fun PoDetailScreen(viewModel: AppViewModel) {
    val po by viewModel.poDetail.collectAsState()
    var form by remember { mutableStateOf<FormPo?>(null) }
    var bayar by remember { mutableStateOf<PoTagihan?>(null) }
    var tutup by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { viewModel.loadPoDetail() }
    val hari = remember { Clock.System.now().toLocalDateTime(TimeZone.of("Asia/Jakarta")).date }

    BizScreen(po?.poNumber ?: "Purchase Order", subtitle = po?.supplierName, onBack = { viewModel.navigateBack() },
        actions = { BizIconButton(Icons.Rounded.Refresh, "Muat ulang") { viewModel.loadPoDetail() }; Spacer(Modifier.width(8.dp)) }
    ) { padding ->
        val d = po
        if (d == null) { SkeletonList(rows = 5, modifier = Modifier.padding(padding)); return@BizScreen }
        val (labelStatus, warna) = when (d.status.uppercase()) {
            "DRAFT" -> "Draft" to BizgrowColors.Info; "SENT" -> "Dikirim" to BizgrowColors.Info; "PARTIAL" -> "Diterima sebagian" to BizgrowColors.Warning
            "RECEIVED", "COMPLETED" -> "Selesai" to BizgrowColors.Success; "CLOSED" -> "Ditutup" to BizgrowColors.Success; "CANCELLED" -> "Dibatalkan" to BizgrowColors.Danger
            else -> d.status to BizgrowColors.Primary
        }
        val menungguBarang = d.status in setOf("SENT", "PARTIAL")
        val adaYangBisaDitagih = d.items.any { it.qtyReceived - it.qtyInvoiced - it.qtyReturned > 0 }
        val adaYangBisaDiretur = d.items.any { it.qtyReceived - it.qtyReturned > 0 }

        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                GradientCard(Modifier.fillMaxWidth()) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Total PO", style = MaterialTheme.typography.bodyMedium, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.8f), modifier = Modifier.weight(1f))
                            StatusChip(labelStatus, androidx.compose.ui.graphics.Color.White)
                        }
                        Text(d.totalAmount.rupiah(), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = androidx.compose.ui.graphics.Color.White)
                        Text(
                            listOfNotNull(d.expectedDate?.let { "Perkiraan datang $it" }, d.supplierPhone.takeIf { it.isNotBlank() }).joinToString(" • "),
                            style = MaterialTheme.typography.bodySmall, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.8f)
                        )
                    }
                }
            }
            // Aksi sesuai status
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (d.status == "DRAFT") BizButton("Kirim PO ke supplier", { viewModel.aksiPo("kirim", "PO dikirim") }, Modifier.fillMaxWidth(), icon = Icons.Rounded.Send)
                    if (menungguBarang) BizButton("Terima barang", { form = FormPo.TERIMA }, Modifier.fillMaxWidth(), icon = Icons.Rounded.Inventory)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (adaYangBisaDitagih) BizOutlineButton("Catat tagihan", { form = FormPo.TAGIH }, Modifier.weight(1f), icon = Icons.Rounded.Receipt, height = 46.dp)
                        if (adaYangBisaDiretur) BizOutlineButton("Retur", { form = FormPo.RETUR }, Modifier.weight(1f), icon = Icons.AutoMirrored.Rounded.Undo, height = 46.dp)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (menungguBarang) BizOutlineButton("Tutup PO", { tutup = true }, Modifier.weight(1f), icon = Icons.Rounded.Lock, height = 46.dp)
                        if (d.status in setOf("DRAFT", "SENT")) BizOutlineButton("Batalkan", { form = FormPo.BATAL }, Modifier.weight(1f), tint = BizgrowColors.Danger, icon = Icons.Rounded.Close, height = 46.dp)
                    }
                }
            }
            // Barang
            item { SectionTitle("Barang dipesan") }
            items(d.items.size) { n ->
                val i = d.items[n]
                BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(i.namaProduk, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Text("${i.unitPrice.rupiah()} × ${i.qtyOrdered}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text(i.totalPrice.rupiah(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(8.dp))
                    val persen = if (i.qtyOrdered > 0) (i.qtyReceived.toFloat() / i.qtyOrdered).coerceIn(0f, 1f) else 0f
                    Box(Modifier.fillMaxWidth().height(6.dp).clip(CircleShape).background(MaterialTheme.colorScheme.outlineVariant)) {
                        Box(Modifier.fillMaxWidth(persen).fillMaxHeight().clip(CircleShape).background(BizgrowColors.Success))
                    }
                    Text("Diterima ${i.qtyReceived}/${i.qtyOrdered} • Ditagih ${i.qtyInvoiced} • Retur ${i.qtyReturned}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                }
            }
            item {
                BizSurface(Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.surfaceVariant, border = false) {
                    if (d.diskon > 0) BarisRingkas("Diskon", "-" + d.diskon.rupiah())
                    if (d.ongkir > 0) BarisRingkas("Ongkir", d.ongkir.rupiah())
                    if (d.ppnPersen > 0) BarisRingkas("PPN", "${d.ppnPersen}%")
                    BarisRingkas("Total", d.totalAmount.rupiah(), tebal = true)
                    if (d.notes.isNotBlank()) Text("Catatan: ${d.notes}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                }
            }
            // Penerimaan
            if (d.penerimaan.isNotEmpty()) {
                item { SectionTitle("Riwayat penerimaan") }
                items(d.penerimaan.size) { n ->
                    val p = d.penerimaan[n]
                    ListRow(p.nomor, subtitle = listOf(p.tanggal, p.noSuratJalan.takeIf { it.isNotBlank() }?.let { "SJ $it" }, p.ringkasan).filterNotNull().filter { it.isNotBlank() }.joinToString(" • "), icon = Icons.Rounded.Inventory, tint = BizgrowColors.Success)
                }
            }
            // Tagihan
            if (d.tagihan.isNotEmpty()) {
                item { SectionTitle("Tagihan & pembayaran") }
                items(d.tagihan.size) { n ->
                    val t = d.tagihan[n]
                    val sisa = t.nominalHutang - t.sudahDibayar
                    BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("Faktur ${t.nomorFaktur}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text("${t.tanggal} • jatuh tempo ${t.jatuhTempo}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            StatusChip(if (sisa <= 0.5) "Lunas" else if (t.sudahDibayar > 0) "Sebagian" else "Belum bayar", if (sisa <= 0.5) BizgrowColors.Success else BizgrowColors.Warning)
                        }
                        Spacer(Modifier.height(6.dp))
                        BarisRingkas("Tagihan", t.nominalHutang.rupiah())
                        BarisRingkas("Sudah dibayar", t.sudahDibayar.rupiah())
                        if (sisa > 0.5) {
                            BarisRingkas("Sisa", sisa.rupiah(), tebal = true)
                            Spacer(Modifier.height(8.dp))
                            BizButton("Bayar", { bayar = t }, Modifier.fillMaxWidth(), height = 44.dp, icon = Icons.Rounded.Payments)
                        }
                    }
                }
            }
            // Retur
            if (d.retur.isNotEmpty()) {
                item { SectionTitle("Retur ke supplier") }
                items(d.retur.size) { n ->
                    val r = d.retur[n]
                    ListRow(r.nomor, subtitle = listOf(r.tanggal, r.alasan, r.ringkasan).filter { it.isNotBlank() }.joinToString(" • "), icon = Icons.AutoMirrored.Rounded.Undo, tint = BizgrowColors.Danger)
                }
            }
        }

        // ── Form-form ──
        form?.let { f ->
            val qty = remember(f) { mutableStateMapOf<Int, String>() }
            var tanggal by remember(f) { mutableStateOf(hari.toString()) }
            var teks1 by remember(f) { mutableStateOf("") }   // surat jalan / no faktur / alasan
            var teks2 by remember(f) { mutableStateOf("") }   // catatan
            var tempo by remember(f) { mutableStateOf(hari.plus(30, DateTimeUnit.DAY).toString()) }
            val maks: (PoItemDetail) -> Int = { i ->
                when (f) {
                    FormPo.TERIMA -> i.qtyOrdered - i.qtyReceived
                    FormPo.TAGIH -> i.qtyReceived - i.qtyInvoiced - i.qtyReturned
                    FormPo.RETUR -> i.qtyReceived - i.qtyReturned
                    FormPo.BATAL -> 0
                }.coerceAtLeast(0)
            }
            val adaQty = d.items.any { (qty[it.id]?.toIntOrNull() ?: 0) > 0 }
            val judul = when (f) { FormPo.TERIMA -> "Terima barang"; FormPo.TAGIH -> "Catat tagihan supplier"; FormPo.RETUR -> "Retur barang"; FormPo.BATAL -> "Batalkan PO" }
            val sah = when (f) {
                FormPo.TERIMA -> adaQty
                FormPo.TAGIH -> adaQty && teks1.isNotBlank() && tempo >= tanggal
                FormPo.RETUR -> adaQty && teks1.isNotBlank()
                FormPo.BATAL -> true
            }
            FormSheet(
                judul, onDismiss = { form = null }, simpanAktif = sah,
                subjudul = when (f) {
                    FormPo.TERIMA -> "Isi jumlah yang benar-benar datang. Stok produk langsung bertambah."
                    FormPo.TAGIH -> "Tagihan masuk sebagai hutang dan jurnal otomatis."
                    FormPo.RETUR -> "Stok berkurang; barang yang sudah ditagih memotong hutang."
                    FormPo.BATAL -> "PO yang dibatalkan tidak bisa diproses lagi."
                },
                labelSimpan = if (f == FormPo.BATAL) "Batalkan PO" else "Simpan",
                onSimpan = {
                    when (f) {
                        FormPo.TERIMA -> viewModel.aksiPo("terima", "Penerimaan disimpan, stok bertambah", buildJsonObject { put("tanggal", tanggal); put("noSuratJalan", teks1); put("catatan", teks2); baris(d.items, qty) })
                        FormPo.TAGIH -> viewModel.aksiPo("tagih", "Tagihan dicatat sebagai hutang", buildJsonObject { put("nomorFaktur", teks1); put("tanggal", tanggal); put("jatuhTempo", tempo); baris(d.items, qty) })
                        FormPo.RETUR -> viewModel.aksiPo("retur", "Retur dicatat, stok dikurangi", buildJsonObject { put("tanggal", tanggal); put("alasan", teks1); baris(d.items, qty) })
                        FormPo.BATAL -> viewModel.aksiPo("batal", "PO dibatalkan", buildJsonObject { put("alasan", teks1) })
                    }
                    form = null
                }
            ) {
                if (f != FormPo.BATAL) TanggalField(if (f == FormPo.TAGIH) "Tanggal faktur" else "Tanggal", tanggal) { tanggal = it }
                when (f) {
                    FormPo.TERIMA -> { BizTextField(teks1, { teks1 = it }, "No. surat jalan (opsional)"); BizTextField(teks2, { teks2 = it }, "Catatan (opsional)") }
                    FormPo.TAGIH -> { BizTextField(teks1, { teks1 = it }, "Nomor faktur supplier *"); TanggalField("Jatuh tempo", tempo) { tempo = it } }
                    FormPo.RETUR -> BizTextField(teks1, { teks1 = it }, "Alasan retur *", placeholder = "Barang rusak / tidak sesuai")
                    FormPo.BATAL -> BizTextField(teks1, { teks1 = it }, "Alasan (opsional)")
                }
                if (f != FormPo.BATAL) {
                    Text("JUMLAH PER BARANG", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = BizgrowColors.Primary)
                    d.items.forEach { i ->
                        val m = maks(i)
                        if (m > 0) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Column(Modifier.weight(1f)) {
                                Text(i.namaProduk, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, maxLines = 2)
                                Text("Maks $m", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Box(Modifier.width(110.dp)) {
                                AngkaField(qty[i.id] ?: "", { v -> qty[i.id] = (v.toIntOrNull()?.coerceAtMost(m)?.toString() ?: "") }, "Qty", desimal = false)
                            }
                            FilterPill("Semua", false, { qty[i.id] = m.toString() })
                        }
                    }
                    if (d.items.none { maks(it) > 0 }) Text("Tidak ada barang yang bisa diproses.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        bayar?.let { t ->
            val sisa = t.nominalHutang - t.sudahDibayar
            var nominal by remember(t) { mutableStateOf(sisa.toLong().toString()) }
            var kas by remember(t) { mutableStateOf<String?>(d.akunKas.firstOrNull()?.id?.toString()) }
            FormSheet(
                "Bayar tagihan ${t.nomorFaktur}", subjudul = "Sisa tagihan ${sisa.rupiah()}", onDismiss = { bayar = null },
                simpanAktif = (nominal.toDoubleOrNull() ?: 0.0).let { it > 0 && it <= sisa + 0.5 } && kas != null, labelSimpan = "Catat pembayaran",
                onSimpan = {
                    viewModel.aksiPo("bayar", "Pembayaran dicatat", buildJsonObject { put("payableId", t.payableId); put("nominal", nominal.toDouble()); put("kasCoaId", kas!!.toInt()) })
                    bayar = null
                }
            ) {
                AngkaField(nominal, { nominal = it }, "Nominal bayar (Rp)", desimal = false)
                PilihanField("Dibayar dari", d.akunKas.map { it.id.toString() to "${it.kodeAkun} · ${it.namaAkun}" }, kas, { kas = it }, placeholder = "Pilih akun kas/bank")
            }
        }
        if (tutup) KonfirmasiAksi("Tutup PO?", "Sisa barang tidak ditunggu lagi. PO ini dianggap selesai.", "Ya, tutup", { viewModel.aksiPo("tutup", "PO ditutup"); tutup = false }, { tutup = false })
    }
}

@Composable
private fun BarisRingkas(label: String, nilai: String, tebal: Boolean = false) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(nilai, style = MaterialTheme.typography.bodyMedium, fontWeight = if (tebal) FontWeight.Bold else FontWeight.Normal)
    }
}

@Composable
private fun KonfirmasiAksi(judul: String, pesan: String, labelYa: String, onYa: () -> Unit, onBatal: () -> Unit) {
    AlertDialog(
        onDismissRequest = onBatal, shape = RoundedCornerShape(24.dp), containerColor = MaterialTheme.colorScheme.surface,
        title = { Text(judul) }, text = { Text(pesan) },
        confirmButton = { TextButton(onClick = onYa) { Text(labelYa, fontWeight = FontWeight.Bold) } },
        dismissButton = { TextButton(onClick = onBatal) { Text("Batal") } }
    )
}
