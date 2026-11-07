package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.pressClick
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import com.upstyle.bizgrow.ui.theme.LocalBizPalette
import kotlinx.serialization.json.*

// ═══════════════════════════════════════════════════════════════════════════
//  Parser jawaban AI → blok. Format sama dengan formatAI() di ChatAI.svelte:
//  markdown (tabel, heading, daftar, kutipan, kode) + komponen kaya :::metric/alert/badge/progress/grid/steps:::
// ═══════════════════════════════════════════════════════════════════════════

sealed class AiBlock {
    data class Para(val teks: String) : AiBlock()
    data class Heading(val level: Int, val teks: String) : AiBlock()
    data class Bullet(val teks: String) : AiBlock()
    data class Nomor(val no: Int, val teks: String) : AiBlock()
    data class Kutipan(val teks: String) : AiBlock()
    data class Kode(val teks: String) : AiBlock()
    data class Tabel(val header: List<String>, val baris: List<List<String>>) : AiBlock()
    data class Metric(val label: String, val nilai: String, val tren: String, val warna: String) : AiBlock()
    data class Alert(val tipe: String, val judul: String, val pesan: String) : AiBlock()
    data class Badge(val teks: String, val warna: String) : AiBlock()
    data class Progress(val label: String, val nilai: Int, val warna: String) : AiBlock()
    data class Grid(val kartu: List<Pair<String, String>>) : AiBlock()
    data class Langkah(val daftar: List<String>) : AiBlock()
    data object Garis : AiBlock()
}

private val reAtribStr = { attrs: String, k: String -> Regex("$k:\\s*\"([^\"]*)\"").find(attrs)?.groupValues?.get(1).orEmpty() }
private val reAtribNum = { attrs: String, k: String -> Regex("$k:\\s*(\\d+)").find(attrs)?.groupValues?.get(1)?.toIntOrNull() ?: 0 }

private fun barisTabel(l: String) = l.trim().let { it.startsWith("|") && it.endsWith("|") && it.length > 2 }
private fun pemisahTabel(l: String) = l.trim().let { Regex("^\\|[-| :\\t]+\\|\\s*$").matches(it) }
private fun sel(l: String) = l.trim().removePrefix("|").removeSuffix("|").split("|").map { it.trim() }

fun parseAi(teks: String): List<AiBlock> {
    val out = mutableListOf<AiBlock>()
    val baris = teks.replace("\r\n", "\n").split("\n")
    var i = 0
    val para = StringBuilder()
    fun tutupPara() { if (para.isNotBlank()) out += AiBlock.Para(para.toString().trim()); para.clear() }

    while (i < baris.size) {
        val raw = baris[i]
        val l = raw.trim()

        // blok kode ```…```
        if (l.startsWith("```")) {
            tutupPara()
            val isi = StringBuilder()
            i++
            while (i < baris.size && !baris[i].trim().startsWith("```")) { isi.appendLine(baris[i]); i++ }
            i++
            out += AiBlock.Kode(isi.toString().trim())
            continue
        }
        // tabel markdown
        if (barisTabel(l) && i + 1 < baris.size && pemisahTabel(baris[i + 1])) {
            tutupPara()
            val header = sel(l)
            var j = i + 2
            val isi = mutableListOf<List<String>>()
            while (j < baris.size && barisTabel(baris[j])) { isi += sel(baris[j]); j++ }
            out += AiBlock.Tabel(header, isi)
            i = j
            continue
        }
        // :::grid::: … :::endgrid:::
        if (l == ":::grid:::") {
            tutupPara()
            val kartu = mutableListOf<Pair<String, String>>()
            i++
            while (i < baris.size && baris[i].trim() != ":::endgrid:::") {
                val item = baris[i].trim()
                if (item.startsWith("-")) {
                    val bersih = item.removePrefix("-").trim()
                    val m = Regex("^\\*\\*(.+?)\\*\\*[:\\s]*(.*)").find(bersih)
                    kartu += if (m != null) m.groupValues[1] to m.groupValues[2] else "" to bersih
                }
                i++
            }
            i++
            out += AiBlock.Grid(kartu)
            continue
        }
        // :::steps::: … :::endsteps:::
        if (l == ":::steps:::") {
            tutupPara()
            val daftar = mutableListOf<String>()
            i++
            while (i < baris.size && baris[i].trim() != ":::endsteps:::") {
                val item = baris[i].trim()
                if (item.isNotEmpty()) daftar += item.replace(Regex("^\\d+\\.\\s*"), "").removePrefix("-").trim()
                i++
            }
            i++
            out += AiBlock.Langkah(daftar)
            continue
        }
        // komponen satu baris :::tipe{…}:::
        val komp = Regex("^:::(metric|alert|badge|progress)\\{([^}]+)\\}:::$").find(l)
        if (komp != null) {
            tutupPara()
            val a = komp.groupValues[2]
            out += when (komp.groupValues[1]) {
                "metric" -> AiBlock.Metric(reAtribStr(a, "label"), reAtribStr(a, "value"), reAtribStr(a, "trend"), reAtribStr(a, "color").ifBlank { "indigo" })
                "alert" -> AiBlock.Alert(reAtribStr(a, "type").ifBlank { "info" }, reAtribStr(a, "title"), reAtribStr(a, "msg"))
                "badge" -> AiBlock.Badge(reAtribStr(a, "text"), reAtribStr(a, "color").ifBlank { "indigo" })
                else -> AiBlock.Progress(reAtribStr(a, "label"), reAtribNum(a, "value").coerceIn(0, 100), reAtribStr(a, "color").ifBlank { "indigo" })
            }
            i++
            continue
        }
        when {
            l.isEmpty() -> tutupPara()
            Regex("^-{3,}$").matches(l) -> { tutupPara(); out += AiBlock.Garis }
            l.startsWith(">") -> { tutupPara(); out += AiBlock.Kutipan(l.removePrefix(">").trim()) }
            Regex("^#{1,4}\\s+.+").matches(l) -> {
                tutupPara()
                val lv = l.takeWhile { it == '#' }.length
                out += AiBlock.Heading(lv, l.dropWhile { it == '#' }.trim())
            }
            Regex("^[-*•]\\s+.+").matches(l) -> { tutupPara(); out += AiBlock.Bullet(l.drop(1).trim()) }
            Regex("^\\d+[.)]\\s+.+").matches(l) -> {
                tutupPara()
                val no = l.takeWhile { it.isDigit() }.toInt()
                out += AiBlock.Nomor(no, l.dropWhile { it.isDigit() }.drop(1).trim())
            }
            else -> { if (para.isNotEmpty()) para.append('\n'); para.append(l) }
        }
        i++
    }
    tutupPara()
    return out
}

// ─── Teks sebaris: **tebal**, *miring*, `kode`, [label](url) ────────────────

data class AiLink(val label: String, val url: String)

private val reInline = Regex("\\*\\*\\*(.+?)\\*\\*\\*|\\*\\*(.+?)\\*\\*|(?<![*\\w])\\*(?!\\s)(.+?)(?<!\\s)\\*(?![*\\w])|`([^`]+)`|\\[([^\\]]+)]\\(([^)]+)\\)")

/** Ubah teks sebaris menjadi AnnotatedString; tautan dikembalikan terpisah agar bisa jadi tombol aksi. */
fun inlineAi(teks: String, kode: Color, link: Color): Pair<AnnotatedString, List<AiLink>> {
    val links = mutableListOf<AiLink>()
    val hasil = buildAnnotatedString {
        var akhir = 0
        for (m in reInline.findAll(teks)) {
            append(teks.substring(akhir, m.range.first))
            val g = m.groupValues
            when {
                g[1].isNotEmpty() -> withStyle(SpanStyle(fontWeight = FontWeight.Bold, fontStyle = FontStyle.Italic)) { append(g[1]) }
                g[2].isNotEmpty() -> withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(g[2]) }
                g[3].isNotEmpty() -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(g[3]) }
                g[4].isNotEmpty() -> withStyle(SpanStyle(fontFamily = FontFamily.Monospace, background = kode.copy(alpha = 0.14f), color = kode)) { append(g[4]) }
                g[5].isNotEmpty() -> {
                    links += AiLink(g[5], g[6])
                    withStyle(SpanStyle(color = link, textDecoration = TextDecoration.Underline, fontWeight = FontWeight.SemiBold)) { append(g[5]) }
                }
            }
            akhir = m.range.last + 1
        }
        append(teks.substring(akhir))
    }
    return hasil to links
}

/** Petakan tautan web (/finance/{slug}/piutang dst) ke layar mobile. null = hanya ada di web. */
fun layarDariTautan(url: String): Screen? {
    val u = url.lowercase().substringBefore('?').trimEnd('/')
    fun ada(vararg k: String) = k.any { u.contains(it) }
    return when {
        ada("/entry") -> Screen.TransactionEntry
        ada("jurnal-umum") -> Screen.JurnalUmum
        ada("buku-besar") -> Screen.BukuBesar
        ada("/piutang") -> Screen.Piutang
        ada("/hutang") -> Screen.Hutang
        ada("/laporan") -> Screen.Laporan
        ada("/pos") -> Screen.Pos
        ada("/produk") -> Screen.Products
        ada("pengadaan") -> Screen.Scm
        ada("/hr") -> Screen.Hr
        ada("/crm") -> Screen.Crm
        ada("/cs") -> Screen.Cs
        ada("master-data/coa") -> Screen.Coa
        ada("master-data/aset") -> Screen.FixedAssets
        ada("master-data/pajak") -> Screen.TaxRates
        ada("master-data/budget") -> Screen.Budget
        ada("tutup-buku") -> Screen.ClosingPeriod
        ada("/help") -> Screen.HelpCenter
        ada("/settings") -> Screen.Settings
        ada("/notification") -> Screen.Notifications
        ada("/finance") -> Screen.Finance
        else -> null
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Renderer
// ═══════════════════════════════════════════════════════════════════════════

private fun warnaAi(nama: String): Triple<Color, Color, Color> = when (nama) { // bg, border/aksen, teks
    "green" -> Triple(Color(0xFF10B981).copy(alpha = 0.12f), Color(0xFF10B981), Color(0xFF059669))
    "red" -> Triple(Color(0xFFF43F5E).copy(alpha = 0.12f), Color(0xFFF43F5E), Color(0xFFE11D48))
    "amber" -> Triple(Color(0xFFF59E0B).copy(alpha = 0.14f), Color(0xFFF59E0B), Color(0xFFD97706))
    "blue" -> Triple(Color(0xFF0EA5E9).copy(alpha = 0.12f), Color(0xFF0EA5E9), Color(0xFF0284C7))
    else -> Triple(BizgrowColors.Primary.copy(alpha = 0.12f), BizgrowColors.Primary, BizgrowColors.Primary)
}

@Composable
fun AiRichText(
    teks: String,
    modifier: Modifier = Modifier,
    onTautan: (String) -> Unit = {}
) {
    val blok = remember(teks) { parseAi(teks) }
    val warnaTeks = MaterialTheme.colorScheme.onSurface
    val kode = BizgrowColors.Violet
    val link = BizgrowColors.Primary
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        blok.forEach { b ->
            when (b) {
                is AiBlock.Para -> TeksSebaris(b.teks, kode, link, onTautan, MaterialTheme.typography.bodyMedium.copy(color = warnaTeks, lineHeight = 21.sp))
                is AiBlock.Heading -> Text(
                    inlineAi(b.teks, kode, link).first,
                    style = if (b.level <= 2) MaterialTheme.typography.titleMedium else MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold, color = warnaTeks,
                    modifier = Modifier.padding(top = 4.dp)
                )
                is AiBlock.Bullet -> Row(Modifier.padding(start = 4.dp)) {
                    Box(Modifier.padding(top = 8.dp, end = 10.dp).size(5.dp).clip(CircleShape).background(BizgrowColors.Primary))
                    TeksSebaris(b.teks, kode, link, onTautan, MaterialTheme.typography.bodyMedium.copy(color = warnaTeks, lineHeight = 21.sp), Modifier.weight(1f))
                }
                is AiBlock.Nomor -> Row(Modifier.padding(start = 2.dp)) {
                    Text("${b.no}.", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = BizgrowColors.Primary, modifier = Modifier.width(24.dp))
                    TeksSebaris(b.teks, kode, link, onTautan, MaterialTheme.typography.bodyMedium.copy(color = warnaTeks, lineHeight = 21.sp), Modifier.weight(1f))
                }
                is AiBlock.Kutipan -> Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(BizgrowColors.Primary.copy(alpha = 0.08f)).padding(10.dp)
                ) {
                    Box(Modifier.width(3.dp).height(IntrinsicSize.Min).clip(CircleShape).background(BizgrowColors.Primary))
                    Spacer(Modifier.width(8.dp))
                    TeksSebaris(b.teks, kode, link, onTautan, MaterialTheme.typography.bodySmall.copy(color = warnaTeks))
                }
                is AiBlock.Kode -> Text(
                    b.teks,
                    fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = warnaTeks,
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(LocalBizPalette.current.surfaceVariant)
                        .horizontalScroll(rememberScrollState()).padding(10.dp)
                )
                is AiBlock.Tabel -> TabelAi(b)
                is AiBlock.Metric -> {
                    val (bg, aksen, tk) = warnaAi(b.warna)
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(bg).border(1.dp, aksen.copy(alpha = 0.35f), RoundedCornerShape(14.dp)).padding(12.dp)) {
                        Text(b.label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(b.nilai, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = tk)
                            if (b.tren.isNotBlank()) {
                                Spacer(Modifier.width(8.dp))
                                Text(b.tren, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = tk,
                                    modifier = Modifier.clip(CircleShape).background(aksen.copy(alpha = 0.2f)).padding(horizontal = 8.dp, vertical = 2.dp))
                            }
                        }
                    }
                }
                is AiBlock.Alert -> {
                    val (warna, ikon) = when (b.tipe) {
                        "warning" -> "amber" to "⚠️"; "success" -> "green" to "✅"; "danger" -> "red" to "🚨"; else -> "blue" to "ℹ️"
                    }
                    val (bg, aksen, _) = warnaAi(warna)
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(bg).border(1.dp, aksen.copy(alpha = 0.35f), RoundedCornerShape(14.dp)).padding(12.dp)) {
                        Text(ikon, fontSize = 16.sp)
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f)) {
                            if (b.judul.isNotBlank()) Text(b.judul, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = warnaTeks)
                            Text(b.pesan, style = MaterialTheme.typography.bodySmall, color = warnaTeks)
                        }
                    }
                }
                is AiBlock.Badge -> {
                    val (bg, _, tk) = warnaAi(b.warna)
                    Text(b.teks, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = tk,
                        modifier = Modifier.clip(CircleShape).background(bg).padding(horizontal = 10.dp, vertical = 3.dp))
                }
                is AiBlock.Progress -> {
                    val (_, aksen, _) = warnaAi(b.warna)
                    Column(Modifier.fillMaxWidth()) {
                        Row(Modifier.fillMaxWidth()) {
                            Text(b.label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                            Text("${b.nilai}%", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = aksen)
                        }
                        Spacer(Modifier.height(4.dp))
                        Box(Modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(LocalBizPalette.current.surfaceVariant)) {
                            Box(Modifier.fillMaxWidth(b.nilai / 100f).fillMaxHeight().clip(CircleShape).background(aksen))
                        }
                    }
                }
                is AiBlock.Grid -> Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    b.kartu.chunked(2).forEach { baris ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            baris.forEach { (jd, desk) ->
                                Column(
                                    Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(12.dp))
                                        .background(LocalBizPalette.current.surfaceVariant)
                                        .border(1.dp, LocalBizPalette.current.border, RoundedCornerShape(12.dp)).padding(10.dp)
                                ) {
                                    if (jd.isNotBlank()) Text(jd, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = warnaTeks)
                                    Text(inlineAi(desk, kode, link).first, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            if (baris.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
                is AiBlock.Langkah -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    b.daftar.forEachIndexed { n, s ->
                        Row(verticalAlignment = Alignment.Top) {
                            Box(Modifier.size(22.dp).clip(CircleShape).background(BizgrowColors.Primary), contentAlignment = Alignment.Center) {
                                Text("${n + 1}", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            Spacer(Modifier.width(10.dp))
                            TeksSebaris(s, kode, link, onTautan, MaterialTheme.typography.bodyMedium.copy(color = warnaTeks, lineHeight = 20.sp), Modifier.weight(1f).padding(top = 1.dp))
                        }
                    }
                }
                AiBlock.Garis -> Box(Modifier.fillMaxWidth().height(1.dp).background(LocalBizPalette.current.border))
            }
        }
    }
}

/** Teks sebaris + tombol aksi untuk tiap tautan di dalamnya. */
@Composable
private fun TeksSebaris(
    teks: String, kode: Color, link: Color, onTautan: (String) -> Unit,
    gaya: androidx.compose.ui.text.TextStyle, modifier: Modifier = Modifier
) {
    val (teksJadi, links) = remember(teks) { inlineAi(teks, kode, link) }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(teksJadi, style = gaya)
        if (links.isNotEmpty()) {
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                links.forEach { l ->
                    Text(
                        "→ ${l.label}",
                        style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = BizgrowColors.Primary,
                        modifier = Modifier.clip(CircleShape).background(BizgrowColors.Primary.copy(alpha = 0.12f))
                            .pressClick { onTautan(l.url) }.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun TabelAi(t: AiBlock.Tabel) {
    val p = LocalBizPalette.current
    val kolom = t.header.size.coerceAtLeast(1)
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, p.border, RoundedCornerShape(12.dp)).horizontalScroll(rememberScrollState())
    ) {
        Row(Modifier.background(BizgrowColors.Primary.copy(alpha = 0.10f))) {
            t.header.forEach { h ->
                Text(inlineAi(h, BizgrowColors.Violet, BizgrowColors.Primary).first, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.widthIn(min = 92.dp, max = 180.dp).padding(horizontal = 10.dp, vertical = 8.dp))
            }
        }
        t.baris.forEachIndexed { n, baris ->
            Row(Modifier.background(if (n % 2 == 1) p.surfaceVariant.copy(alpha = 0.5f) else Color.Transparent)) {
                for (k in 0 until kolom) {
                    Text(inlineAi(baris.getOrElse(k) { "" }, BizgrowColors.Violet, BizgrowColors.Primary).first, style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.widthIn(min = 92.dp, max = 180.dp).padding(horizontal = 10.dp, vertical = 7.dp))
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Grafik (konfigurasi Chart.js dari server): bar, line, pie/doughnut
// ═══════════════════════════════════════════════════════════════════════════

private val paletGrafik = listOf(
    Color(0xFF6366F1), Color(0xFF10B981), Color(0xFFF59E0B), Color(0xFFF43F5E),
    Color(0xFF0EA5E9), Color(0xFF8B5CF6), Color(0xFF14B8A6), Color(0xFFEC4899)
)

private data class SeriGrafik(val label: String, val nilai: List<Float>)

@Composable
fun GrafikAi(chartJson: String, modifier: Modifier = Modifier) {
    val data = remember(chartJson) {
        try {
            val root = Json.parseToJsonElement(chartJson).jsonObject
            val tipe = root["type"]?.jsonPrimitive?.contentOrNull ?: "bar"
            val d = root["data"]?.jsonObject
            val label = d?.get("labels")?.jsonArray?.map { it.jsonPrimitive.content }.orEmpty()
            val seri = d?.get("datasets")?.jsonArray?.map { ds ->
                val o = ds.jsonObject
                SeriGrafik(
                    o["label"]?.jsonPrimitive?.contentOrNull ?: "",
                    o["data"]?.jsonArray?.map { it.jsonPrimitive.floatOrNull ?: 0f }.orEmpty()
                )
            }.orEmpty()
            Triple(tipe, label, seri)
        } catch (e: Exception) { null }
    } ?: return
    val (tipe, label, seri) = data
    if (seri.isEmpty() || label.isEmpty()) return
    val p = LocalBizPalette.current
    val teksWarna = MaterialTheme.colorScheme.onSurfaceVariant

    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(p.surfaceVariant.copy(alpha = 0.6f))
            .border(1.dp, p.border, RoundedCornerShape(14.dp)).padding(12.dp)
    ) {
        if (tipe == "pie" || tipe == "doughnut") {
            val nilai = seri.first().nilai
            val total = nilai.sum().takeIf { it > 0f } ?: 1f
            Row(verticalAlignment = Alignment.CenterVertically) {
                Canvas(Modifier.size(120.dp)) {
                    var awal = -90f
                    nilai.forEachIndexed { n, v ->
                        val sapu = v / total * 360f
                        drawArc(paletGrafik[n % paletGrafik.size], awal, sapu, useCenter = tipe == "pie", style = if (tipe == "pie") androidx.compose.ui.graphics.drawscope.Fill else Stroke(28f))
                        awal += sapu
                    }
                }
                Spacer(Modifier.width(14.dp))
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    label.forEachIndexed { n, l ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(8.dp).clip(CircleShape).background(paletGrafik[n % paletGrafik.size]))
                            Spacer(Modifier.width(6.dp))
                            Text("$l  ${(nilai.getOrElse(n) { 0f } / total * 100).toInt()}%", style = MaterialTheme.typography.labelSmall, color = teksWarna)
                        }
                    }
                }
            }
        } else {
            val maks = (seri.maxOf { s -> s.nilai.maxOrNull() ?: 0f }).coerceAtLeast(1f)
            val garis = tipe == "line"
            Canvas(Modifier.fillMaxWidth().height(150.dp)) {
                val w = size.width; val h = size.height
                for (g in 0..3) drawLine(p.border, Offset(0f, h * g / 3f), Offset(w, h * g / 3f), 1f)
                val n = label.size
                val sel = w / n
                if (garis) {
                    seri.forEachIndexed { si, s ->
                        val path = Path()
                        s.nilai.forEachIndexed { k, v ->
                            val x = sel * k + sel / 2; val y = h - (v / maks) * h
                            if (k == 0) path.moveTo(x, y) else path.lineTo(x, y)
                        }
                        drawPath(path, paletGrafik[si % paletGrafik.size], style = Stroke(5f, cap = StrokeCap.Round))
                        s.nilai.forEachIndexed { k, v -> drawCircle(paletGrafik[si % paletGrafik.size], 6f, Offset(sel * k + sel / 2, h - (v / maks) * h)) }
                    }
                } else {
                    val lebar = (sel * 0.7f) / seri.size
                    seri.forEachIndexed { si, s ->
                        s.nilai.forEachIndexed { k, v ->
                            val tinggi = (v / maks) * h
                            drawRoundRect(
                                paletGrafik[si % paletGrafik.size],
                                Offset(sel * k + sel * 0.15f + lebar * si, h - tinggi),
                                Size(lebar * 0.92f, tinggi), CornerRadius(6f)
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.height(6.dp))
            Row(Modifier.fillMaxWidth()) {
                label.forEach { l -> Text(l, style = MaterialTheme.typography.labelSmall, color = teksWarna, maxLines = 1, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontSize = 9.sp) }
            }
            if (seri.size > 1 || seri.first().label.isNotBlank()) {
                Spacer(Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                    seri.forEachIndexed { n, s ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(8.dp).clip(CircleShape).background(paletGrafik[n % paletGrafik.size]))
                            Spacer(Modifier.width(4.dp))
                            Text(s.label, style = MaterialTheme.typography.labelSmall, color = teksWarna)
                        }
                    }
                }
            }
        }
    }
}
