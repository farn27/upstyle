package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.coroutines.launch
import kotlinx.serialization.json.*

private val judulLangkah = listOf("Identitas Bisnis", "Target Pasar", "Proposisi Nilai", "Model Pendapatan", "Modal & Biaya", "Channel Penjualan", "Review & Simpan")
private val modelPendapatan = listOf("JUAL_PRODUK" to "Jual produk fisik", "JUAL_JASA" to "Jual jasa", "LANGGANAN" to "Langganan", "KOMISI" to "Komisi", "IKLAN" to "Iklan", "CAMPURAN" to "Campuran")
private val channelList = listOf("offline" to "Toko offline", "online" to "Website/online", "marketplace" to "Marketplace", "whatsapp" to "WhatsApp", "delivery" to "Ojol delivery", "reseller" to "Reseller")
private val platformList = listOf("Shopee" to "Shopee", "Tokopedia" to "Tokopedia", "Instagram" to "Instagram", "TikTok Shop" to "TikTok Shop", "Lazada" to "Lazada", "Website Sendiri" to "Website sendiri")
private val kunciCanvas = listOf(
    "value_proposition" to "Proposisi nilai", "customer_segments" to "Segmen pelanggan", "channels" to "Channel", "customer_relationships" to "Hubungan pelanggan",
    "revenue_streams" to "Sumber pendapatan", "key_resources" to "Sumber daya utama", "key_activities" to "Aktivitas utama", "key_partners" to "Mitra utama", "cost_structure" to "Struktur biaya"
)

/** Ambil objek JSON pertama dari jawaban AI (yang sering dibungkus teks / markdown). */
private fun ambilJson(teks: String?): JsonObject? {
    val t = teks ?: return null
    val a = t.indexOf('{'); val b = t.lastIndexOf('}')
    if (a < 0 || b <= a) return null
    return runCatching { Json.parseToJsonElement(t.substring(a, b + 1)) as? JsonObject }.getOrNull()
}

/** Wizard Business Planning 7 langkah — padanan finance/planning/wizard di web, lengkap dengan bantuan AI & proyeksi otomatis. */
@Composable
fun PlanWizardScreen(viewModel: AppViewModel) {
    val scope = rememberCoroutineScope()
    val f = remember { mutableStateMapOf<String, String>() }
    var channel by remember { mutableStateOf(setOf<String>()) }
    var platform by remember { mutableStateOf(setOf<String>()) }
    var langkah by remember { mutableIntStateOf(1) }
    var memuat by remember { mutableStateOf(viewModel.planWizardId != 0) }
    var menyimpan by remember { mutableStateOf(false) }
    var aiBusy by remember { mutableStateOf(false) }
    var saranAi by remember { mutableStateOf<Pair<String, List<String>>?>(null) }
    var ringkasanAi by remember { mutableStateOf("") }
    var selesai by remember { mutableStateOf(false) }
    var canvas by remember { mutableStateOf<JsonObject?>(null) }
    var review by remember { mutableStateOf<JsonObject?>(null) }
    var reviewGalat by remember { mutableStateOf<String?>(null) }
    var reviewBusy by remember { mutableStateOf(false) }
    var diterapkan by remember { mutableStateOf(false) }
    var pilihUnit by remember { mutableStateOf(false) }
    var hasilTerapkan by remember { mutableStateOf<Triple<Boolean, String, Int>?>(null) }
    var unitHasil by remember { mutableIntStateOf(0) }
    var reviewLangkah3 by remember { mutableStateOf<List<String>?>(null) }
    val units by viewModel.units.collectAsState(initial = viewModel.units.value)

    LaunchedEffect(Unit) {
        val p = viewModel.muatPlanLengkap()
        if (p != null) {
            p.forEach { (k, v) ->
                when (k) {
                    "channelPenjualan" -> channel = (v as? JsonArray)?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toSet().orEmpty()
                    "platformOnline" -> platform = (v as? JsonArray)?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toSet().orEmpty()
                    "aiSummary" -> ringkasanAi = (v as? JsonPrimitive)?.contentOrNull.orEmpty()
                    "canvasJson" -> canvas = v as? JsonObject
                    "isSeeded" -> diterapkan = ((v as? JsonPrimitive)?.intOrNull ?: 0) != 0 || (v as? JsonPrimitive)?.booleanOrNull == true
                    "unitId" -> unitHasil = (v as? JsonPrimitive)?.intOrNull ?: 0
                    "currentStep" -> langkah = ((v as? JsonPrimitive)?.intOrNull ?: 1).coerceIn(1, 7)
                    else -> if (v is JsonPrimitive && v !is JsonNull) f[k] = v.content
                }
            }
            // nominal desimal dari server ("5000000.00") → tampil bulat
            listOf("estimasiHarga", "modalAwal", "biayaOperasionalPerBulan").forEach { k -> f[k]?.toDoubleOrNull()?.let { f[k] = it.toLong().toString() } }
        }
        memuat = false
    }

    fun angka(k: String) = f[k]?.toDoubleOrNull() ?: 0.0
    val proyeksi = angka("estimasiHarga") * angka("estimasiVolumePerBulan")
    val breakEven = if (proyeksi > 0) kotlin.math.ceil(angka("modalAwal") / proyeksi).toInt() else 0
    val roi = if (angka("modalAwal") > 0) ((proyeksi - angka("biayaOperasionalPerBulan")) * 12 / angka("modalAwal") * 100) else 0.0

    fun konteks() = buildJsonObject { f.forEach { (k, v) -> if (v.isNotBlank()) put(k, v) } }
    fun badan(status: String?) = buildJsonObject {
        if (viewModel.planWizardId != 0) put("id", viewModel.planWizardId)
        val teks = listOf("namaBisnis", "kategori", "deskripsi", "visi", "misi", "targetPasar", "problemSolving", "targetUsia", "targetLokasi", "nilaiUtama", "keunggulan", "kompetitorUtama", "modelPendapatan")
        teks.forEach { k -> f[k]?.takeIf { it.isNotBlank() }?.let { put(k, it) } }
        listOf("estimasiHarga", "modalAwal", "biayaOperasionalPerBulan").forEach { k -> f[k]?.toDoubleOrNull()?.let { put(k, it) } }
        f["estimasiVolumePerBulan"]?.toIntOrNull()?.let { put("estimasiVolumePerBulan", it) }
        put("proyeksiRevenuePerBulan", proyeksi); put("breakEvenPoint", breakEven); put("roiEstimasi", (roi * 10).toLong() / 10.0)
        put("channelPenjualan", JsonArray(channel.map { JsonPrimitive(it) })); put("platformOnline", JsonArray(platform.map { JsonPrimitive(it) }))
        put("currentStep", langkah)
        if (ringkasanAi.isNotBlank()) put("aiSummary", ringkasanAi)
        canvas?.let { put("canvasJson", it) }
        if (status != null) put("status", status)
    }

    suspend fun simpan(status: String? = null): Boolean { menyimpan = true; val id = viewModel.simpanPlanLengkap(badan(status)); menyimpan = false; return id != null }

    fun bantuAi(field: String) {
        aiBusy = true
        scope.launch {
            val hasil = viewModel.bantuanAiPlan(langkah, field, f["kategori"].orEmpty(), konteks(), "hint")
            saranAi = field to hasil.orEmpty().lines().map { it.replace(Regex("^[-•*\\d.]\\s*"), "").trim() }.filter { it.length > 5 }.take(5)
            aiBusy = false
        }
    }

    /** Konfirmasi akhir oleh AI (verdict, skor, kekuatan, perbaikan) sebelum canvas dibuat. */
    fun periksaRencana() {
        reviewBusy = true; reviewGalat = null; review = null
        scope.launch {
            val jawab = viewModel.bantuanAiPlan(7, "review", f["kategori"].orEmpty(), konteks(), "review")
            review = ambilJson(jawab)
            if (review == null) reviewGalat = "AI belum bisa menilai rencana ini. Kamu tetap bisa lanjut generate."
            reviewBusy = false
        }
    }

    /** AI membuat Business Model Canvas terstruktur + ringkasan eksekutif, lalu rencana disimpan sebagai SELESAI. */
    fun buatCanvas() {
        aiBusy = true
        scope.launch {
            val jawab = viewModel.bantuanAiPlan(7, "canvas", f["kategori"].orEmpty(), konteks(), "canvas")
            val j = ambilJson(jawab)
            if (j != null) {
                canvas = j
                ringkasanAi = (j["executive_summary"] as? JsonPrimitive)?.contentOrNull.orEmpty()
                if (simpan("COMPLETE")) selesai = true
            } else viewModel.showError("AI belum berhasil membuat canvas. Coba lagi.")
            aiBusy = false
        }
    }

    // Masuk langkah terakhir tanpa canvas → AI memeriksa dulu
    LaunchedEffect(langkah, memuat) { if (!memuat && langkah == 7 && canvas == null && review == null && !reviewBusy && !f["namaBisnis"].isNullOrBlank()) periksaRencana() }

    BizScreen("Business Planning", subtitle = "Langkah $langkah/7 • ${judulLangkah[langkah - 1]}", onBack = { viewModel.navigateBack() }) { padding ->
        if (memuat) { SkeletonList(rows = 4, modifier = Modifier.padding(padding)); return@BizScreen }
        Column(Modifier.fillMaxSize().padding(padding)) {
            LinearProgressIndicator(progress = { langkah / 7f }, modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).height(6.dp).clip(CircleShape))
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                @Composable fun teks(k: String, label: String, ph: String? = null, ai: Boolean = false, banyak: Boolean = true) {
                    BizTextField(f[k].orEmpty(), { f[k] = it }, label, placeholder = ph, singleLine = !banyak)
                    if (ai) Row(verticalAlignment = Alignment.CenterVertically) {
                        Row(
                            Modifier.clip(RoundedCornerShape(50)).background(BizgrowColors.Violet.copy(alpha = 0.10f)).pressClick { if (!aiBusy) bantuAi(k) }.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Rounded.AutoAwesome, null, tint = BizgrowColors.Violet, modifier = Modifier.size(15.dp)); Spacer(Modifier.width(6.dp))
                            Text(if (aiBusy && saranAi == null) "Memikirkan…" else "Bantu isi dengan AI", style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Violet, fontWeight = FontWeight.SemiBold)
                        }
                    }
                    saranAi?.takeIf { it.first == k && it.second.isNotEmpty() }?.let { (_, daftar) ->
                        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(BizgrowColors.Violet.copy(alpha = 0.07f)).padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("Saran AI — ketuk untuk memakai", style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Violet, fontWeight = FontWeight.Bold)
                            daftar.forEach { s ->
                                Text(s, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surface)
                                    .pressClick { val cur = f[k].orEmpty(); f[k] = if (cur.isBlank()) s else cur + (if (cur.endsWith(".")) " " else ". ") + s; saranAi = null }.padding(10.dp))
                            }
                        }
                    }
                }
                when (langkah) {
                    1 -> {
                        teks("namaBisnis", "Nama bisnis *", "Contoh: Warung Makan Bu Sari", banyak = false)
                        PilihanField("Kategori usaha *", KategoriUsahaList.filter { it.kode != "DEFAULT" }.map { it.kode to it.label }, f["kategori"], { f["kategori"] = it }, placeholder = "Pilih kategori")
                        teks("deskripsi", "Deskripsi produk/jasa", "Ceritakan produk/jasa yang kamu jual…", ai = true)
                        teks("visi", "Visi", "Menyajikan layanan terbaik…", ai = true)
                        teks("misi", "Misi", ai = true)
                    }
                    2 -> {
                        teks("targetPasar", "Siapa target pelanggan utama?", "Ibu rumah tangga 25-45 tahun…", ai = true)
                        teks("problemSolving", "Problem yang diselesaikan", "Pelanggan kesulitan menemukan…", ai = true)
                        teks("targetUsia", "Rentang usia target", "20-40 tahun", banyak = false)
                        teks("targetLokasi", "Area / lokasi", "Jakarta Selatan", banyak = false)
                    }
                    3 -> {
                        teks("nilaiUtama", "Nilai utama yang ditawarkan", "Makanan rumahan harga warung, bebas MSG…", ai = true)
                        teks("keunggulan", "Keunggulan vs kompetitor", ai = true)
                        teks("kompetitorUtama", "Kompetitor utama", "Warung Pak Joko, GoFood", ai = true)
                        BizOutlineButton(if (aiBusy && reviewLangkah3 == null) "AI sedang menilai…" else "Minta AI review langkah ini", {
                            aiBusy = true
                            scope.launch {
                                val h = viewModel.bantuanAiPlan(3, "step3", f["kategori"].orEmpty(), konteks(), "validate")
                                reviewLangkah3 = h.orEmpty().lines().map { it.replace(Regex("^[-•*\\d.]\\s*"), "").trim() }.filter { it.length > 5 }.take(5)
                                aiBusy = false
                            }
                        }, Modifier.fillMaxWidth(), icon = Icons.Rounded.AutoAwesome, height = 44.dp, tint = BizgrowColors.Violet)
                        reviewLangkah3?.takeIf { it.isNotEmpty() }?.let { daftar ->
                            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(BizgrowColors.Violet.copy(alpha = 0.07f)).padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Review AI", style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Violet, fontWeight = FontWeight.Bold)
                                daftar.forEach { Text("• $it", style = MaterialTheme.typography.bodySmall) }
                            }
                        }
                    }
                    4 -> {
                        PilihanPil("Model pendapatan", modelPendapatan, f["modelPendapatan"]) { f["modelPendapatan"] = it }
                        AngkaField(f["estimasiHarga"].orEmpty(), { f["estimasiHarga"] = it }, "Estimasi harga jual (Rp)", desimal = false)
                        AngkaField(f["estimasiVolumePerBulan"].orEmpty(), { f["estimasiVolumePerBulan"] = it }, "Estimasi volume / bulan", desimal = false)
                        if (proyeksi > 0) BizSurface(Modifier.fillMaxWidth(), color = BizgrowColors.Success.copy(alpha = 0.10f), border = false) {
                            Text("Proyeksi revenue", style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Success)
                            Text(proyeksi.rupiah() + " / bulan", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = BizgrowColors.Success)
                        }
                    }
                    5 -> {
                        AngkaField(f["modalAwal"].orEmpty(), { f["modalAwal"] = it }, "Modal awal (Rp) *", desimal = false)
                        AngkaField(f["biayaOperasionalPerBulan"].orEmpty(), { f["biayaOperasionalPerBulan"] = it }, "Biaya operasional / bulan (Rp)", desimal = false)
                        if (proyeksi > 0 && angka("modalAwal") > 0) Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            StatTile("Break even", "$breakEven bln", Icons.Rounded.Timer, BizgrowColors.Warning, Modifier.weight(1f))
                            StatTile("ROI / tahun", "${(roi * 10).toLong() / 10.0}%", Icons.Rounded.TrendingUp, BizgrowColors.Success, Modifier.weight(1f))
                        }
                    }
                    6 -> {
                        Text("Channel penjualan", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { channelList.forEach { (k, l) -> FilterPill(l, k in channel, { channel = if (k in channel) channel - k else channel + k }) } }
                        if (channel.any { it != "offline" }) {
                            Text("Platform online", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                            @OptIn(ExperimentalLayoutApi::class)
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                platformList.forEach { (k, l) -> FilterPill(l, k in platform, { platform = if (k in platform) platform - k else platform + k }) }
                            }
                        }
                    }
                    else -> {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            StatTile("Revenue / bln", proyeksi.rupiahRingkas(), Icons.Rounded.Paid, BizgrowColors.Info, Modifier.weight(1f))
                            StatTile("Break even", "$breakEven bln", Icons.Rounded.Timer, BizgrowColors.Warning, Modifier.weight(1f))
                            StatTile("ROI / thn", "${(roi * 10).toLong() / 10.0}%", Icons.Rounded.TrendingUp, BizgrowColors.Success, Modifier.weight(1f))
                        }
                        BizSurface(Modifier.fillMaxWidth()) {
                            Text(f["namaBisnis"].orEmpty().ifBlank { "Bisnis baru" }, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text(KategoriUsahaList.firstOrNull { it.kode == f["kategori"] }?.label.orEmpty(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(6.dp))
                            Text("Modal awal ${angka("modalAwal").rupiah()} • biaya operasional ${angka("biayaOperasionalPerBulan").rupiah()}/bln", style = MaterialTheme.typography.bodySmall)
                            if (channel.isNotEmpty()) Text("Channel: " + channel.joinToString(", "), style = MaterialTheme.typography.bodySmall)
                        }

                        // 1) Konfirmasi AI
                        if (canvas == null) BizSurface(Modifier.fillMaxWidth(), color = BizgrowColors.Violet.copy(alpha = 0.07f), border = false) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                AiAvatar(30.dp); Spacer(Modifier.width(10.dp))
                                Text("Konfirmasi AI atas rencanamu", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            }
                            Spacer(Modifier.height(8.dp))
                            when {
                                reviewBusy -> { Text("AI memeriksa kelengkapan & kewajaran angka…", style = MaterialTheme.typography.bodySmall); LinearProgressIndicator(Modifier.fillMaxWidth().padding(top = 8.dp)) }
                                review != null -> {
                                    val r = review!!
                                    val siap = (r["siap"] as? JsonPrimitive)?.booleanOrNull == true
                                    val skor = (r["skor"] as? JsonPrimitive)?.intOrNull
                                    Row(verticalAlignment = Alignment.Bottom) {
                                        Text(skor?.toString() ?: "-", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black, color = if (siap) BizgrowColors.Success else BizgrowColors.Warning)
                                        Text("/100", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(start = 2.dp, bottom = 6.dp))
                                        Spacer(Modifier.width(12.dp))
                                        Text(if (siap) "Rencana siap di-generate" else "Sebaiknya diperbaiki dulu", fontWeight = FontWeight.Bold, color = if (siap) BizgrowColors.Success else BizgrowColors.Warning, modifier = Modifier.padding(bottom = 6.dp))
                                    }
                                    (r["kekuatan"] as? JsonArray)?.forEach { Text("✓ " + (it as? JsonPrimitive)?.contentOrNull.orEmpty(), style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Success) }
                                    (r["perbaikan"] as? JsonArray)?.forEach { Text("• " + (it as? JsonPrimitive)?.contentOrNull.orEmpty(), style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Warning) }
                                }
                                else -> Text(reviewGalat ?: "Minta AI memeriksa rencana sebelum dibuatkan Business Canvas.", style = MaterialTheme.typography.bodySmall)
                            }
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                BizOutlineButton(if (review == null) "Periksa" else "Periksa ulang", { periksaRencana() }, Modifier.weight(1f), icon = Icons.Rounded.Refresh, height = 44.dp, tint = BizgrowColors.Violet)
                                BizOutlineButton("Perbaiki", { langkah = 1; saranAi = null }, Modifier.weight(1f), height = 44.dp)
                            }
                        }

                        // 2) Generate canvas
                        if (canvas == null) {
                            BizButton(if (aiBusy) "AI sedang membuat canvas…" else "Konfirmasi & generate Business Canvas", onClick = { buatCanvas() }, modifier = Modifier.fillMaxWidth(), enabled = !aiBusy && !reviewBusy, loading = aiBusy, icon = Icons.Rounded.AutoAwesome)
                        } else {
                            if (ringkasanAi.isNotBlank()) BizSurface(Modifier.fillMaxWidth(), color = BizgrowColors.Info.copy(alpha = 0.08f), border = false) {
                                Text("Ringkasan eksekutif", style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Info, fontWeight = FontWeight.Bold)
                                Text(ringkasanAi, style = MaterialTheme.typography.bodyMedium)
                            }
                            kunciCanvas.forEach { (k, label) ->
                                val isi = (canvas?.get(k) as? JsonPrimitive)?.contentOrNull.orEmpty()
                                if (isi.isNotBlank()) BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
                                    Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                                    Text(isi, style = MaterialTheme.typography.bodyMedium)
                                }
                            }
                            // 3) Terapkan
                            val hasil = hasilTerapkan
                            if (diterapkan || hasil?.first == true) {
                                BizSurface(Modifier.fillMaxWidth(), color = BizgrowColors.Success.copy(alpha = 0.10f), border = false) {
                                    Text("Berhasil diterapkan 🎉", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = BizgrowColors.Success)
                                    Text(if (hasil != null) "${hasil.third} data (produk, akun, karyawan template, dll.) dibuat otomatis." else "Rencana ini sudah diterapkan menjadi bisnis.", style = MaterialTheme.typography.bodySmall)
                                    Spacer(Modifier.height(8.dp))
                                    BizButton("Buka bisnisku", onClick = { viewModel.navigateBack(); viewModel.navigateBack() }, modifier = Modifier.fillMaxWidth())
                                }
                            } else {
                                hasil?.takeIf { !it.first }?.let { Text(it.second, color = BizgrowColors.Danger, style = MaterialTheme.typography.bodySmall) }
                                BizButton("Terapkan jadi bisnis", onClick = { pilihUnit = true }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.RocketLaunch)
                                Text("Menyiapkan unit, kategori produk, produk contoh, akun (COA), karyawan template, supplier, kategori ABC, dan pajak otomatis.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
            // Navigasi langkah
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (langkah > 1) BizOutlineButton("Sebelumnya", { langkah--; saranAi = null }, Modifier.weight(1f))
                val bisaLanjut = when (langkah) { 1 -> !f["namaBisnis"].isNullOrBlank() && !f["kategori"].isNullOrBlank(); 5 -> angka("modalAwal") > 0; else -> true }
                BizButton(
                    if (langkah == 7) (if (canvas != null) "Selesai" else "Simpan draf") else "Selanjutnya", modifier = Modifier.weight(1.4f), loading = menyimpan, enabled = bisaLanjut,
                    onClick = {
                        scope.launch {
                            if (langkah < 7) { if (simpan()) { langkah++; saranAi = null } }
                            else if (canvas != null) viewModel.navigateBack()
                            else if (simpan()) viewModel.navigateBack()
                        }
                    }
                )
            }
        }
    }

    if (pilihUnit) {
        @OptIn(ExperimentalMaterial3Api::class)
        ModalBottomSheet(onDismissRequest = { pilihUnit = false }, containerColor = MaterialTheme.colorScheme.surface) {
            Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Terapkan ke mana?", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Data awal (kategori produk, produk contoh, akun, karyawan template, supplier, pajak) akan disiapkan otomatis.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                fun jalankan(unitId: Int?) {
                    pilihUnit = false
                    scope.launch {
                        // pastikan versi terbaru tersimpan sebelum diterapkan
                        if (!simpan("COMPLETE")) return@launch
                        viewModel.terapkanPlan(viewModel.planWizardId, unitId) { ok, pesan, total, uid ->
                            hasilTerapkan = Triple(ok, pesan, total)
                            if (ok) { diterapkan = true; if (uid > 0) viewModel.selectUnit(uid) }
                        }
                    }
                }
                BizSurface(Modifier.fillMaxWidth(), onClick = { jalankan(null) }, contentPadding = PaddingValues(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(Icons.Rounded.AddBusiness, BizgrowColors.Success); Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Buat bisnis baru dari rencana ini", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Text(f["namaBisnis"].orEmpty(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                if (units.isNotEmpty()) Text("Atau isi bisnis yang sudah ada", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                units.forEach { u ->
                    BizSurface(Modifier.fillMaxWidth(), onClick = { jalankan(u.id) }, contentPadding = PaddingValues(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconBadge(Icons.Rounded.Store, BizgrowColors.Primary); Spacer(Modifier.width(12.dp))
                            Text(u.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
