package com.upstyle.bizgrow.ui

import com.upstyle.bizgrow.api.UpstyleApi
import com.upstyle.bizgrow.data.*
import io.github.aakira.napier.Napier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

/**
 * Logika chat Bizgrow AI di mobile — mengikuti ChatAI.svelte di web:
 *  - sesi percakapan tersimpan lokal (30 hari, maks 80 pesan/sesi, sesi bisa dihapus)
 *  - konteks unit bisnis (otomatis, atau dipilih bila akun punya >1 unit & pertanyaan soal bisnis)
 *  - saran lanjutan (suggestions), grafik (chartData), kartu konfirmasi transaksi
 *  - mode jawaban instan / mengetik
 */
class AiChatController(
    private val scope: CoroutineScope,
    private val session: SessionRepository,
    private val api: () -> UpstyleApi,
    private val units: () -> List<BusinessUnit>,
    private val activeUnit: () -> BusinessUnit?,
    private val onError: (String) -> Unit,
    private val onTransaksiTersimpan: () -> Unit
) {
    companion object {
        private const val TTL_MS = 30L * 24 * 60 * 60 * 1000
        private const val MAKS_PESAN = 80
        private const val MAKS_SESI = 40
        // Sama persis dengan web (ChatAI.svelte) supaya perilakunya konsisten
        private val BISNIS = Regex(
            "omzet|laba|rugi|kas|saldo|piutang|hutang|stok|produk|barang|karyawan|gaji|absen|pelanggan|deal|invoice|jurnal|kasir|penjualan|transaksi|supplier|aset|pajak|anggaran|gudang|coa|akun|opname|payroll|cuti|shift|crm|pos|restock|profit|pengeluaran|pemasukan|tutup.?buku|closing|cash.?flow|laporan|neraca|arus.?kas|buku.?besar|keuangan|bisnis|analisis|ringkasan|rekap|dead.?stock|follow.?up|pipeline|penyusutan|kontrak|kpi|slip|tunjangan|potongan|bpjs|absensi|purchase.?order|nilai.?aset|tarif|over.?budget|modal|revenue|tagihan|total|voucher|kampanye|iklan|leads?|tiket|ticket|keluhan|toko.?online|marketplace|sales.?order|quotation|komisi|target.?sales",
            RegexOption.IGNORE_CASE
        )
        private val UMUM = Regex(
            "cara|bagaimana|di mana|dimana|apa itu|jelaskan|tutorial|bantuan|help|setting|setup|fitur|menu|aplikasi|export|import|cetak|print|download|integrasi|password|login|tips|strategi|rekomendasi|perbedaan|pengertian|definisi|apa perbedaan|double.?entry|chart of account|onboarding|panduan|petunjuk|langkah",
            RegexOption.IGNORE_CASE
        )
    }

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val serializer = ListSerializer(AiSession.serializer())
    private var counter = 0

    private val _sesi = MutableStateFlow<List<AiSession>>(emptyList())
    /** Semua sesi tersimpan (terbaru di atas), tidak termasuk sesi aktif yang masih kosong. */
    val sesi: StateFlow<List<AiSession>> = _sesi.asStateFlow()

    private val _sesiAktifId = MutableStateFlow(baruId())
    val sesiAktifId: StateFlow<String> = _sesiAktifId.asStateFlow()

    private val _pesan = MutableStateFlow<List<AiMessage>>(emptyList())
    val pesan: StateFlow<List<AiMessage>> = _pesan.asStateFlow()

    private val _saran = MutableStateFlow<List<String>>(emptyList())
    val saran: StateFlow<List<String>> = _saran.asStateFlow()

    private val _memuat = MutableStateFlow(false)
    val memuat: StateFlow<Boolean> = _memuat.asStateFlow()

    /** Id pesan AI terbaru yang sedang "diketik" (animasi). null = tidak ada. */
    private val _mengetikId = MutableStateFlow<String?>(null)
    val mengetikId: StateFlow<String?> = _mengetikId.asStateFlow()

    private val _instan = MutableStateFlow(session.isAiInstant())
    val instan: StateFlow<Boolean> = _instan.asStateFlow()

    /** Unit yang dipilih khusus untuk percakapan ini; null = ikut unit aktif aplikasi. */
    private val _unitDipilihId = MutableStateFlow<Int?>(null)
    val unitDipilihId: StateFlow<Int?> = _unitDipilihId.asStateFlow()

    /** Pesan yang menunggu pengguna memilih unit (picker tampil bila tidak null). */
    private val _menungguUnit = MutableStateFlow<String?>(null)
    val menungguUnit: StateFlow<String?> = _menungguUnit.asStateFlow()

    private val _coa = MutableStateFlow<List<ChartOfAccount>>(emptyList())
    val coa: StateFlow<List<ChartOfAccount>> = _coa.asStateFlow()

    private val _menyimpan = MutableStateFlow<Set<String>>(emptySet())
    /** Kunci "idPesan-indeks" transaksi yang sedang dikirim ke server. */
    val menyimpan: StateFlow<Set<String>> = _menyimpan.asStateFlow()

    private var sudahMuat = false

    // ─── Sesi ────────────────────────────────────────────────────────────────

    private fun baruId(): String = "s${System.currentTimeMillis().toString(36)}${counter++}"

    private fun userId() = session.getUserId()

    /** Panggil saat layar AI dibuka. Aman dipanggil berulang. */
    fun muat() {
        if (sudahMuat) return
        sudahMuat = true
        val mentah = session.getAiSessions(userId())
        val sekarang = System.currentTimeMillis()
        val daftar = try {
            if (mentah.isNullOrBlank()) emptyList() else json.decodeFromString(serializer, mentah)
        } catch (e: Exception) {
            Napier.w("Riwayat AI rusak, diabaikan: ${e.message}")
            emptyList()
        }
        _sesi.value = daftar.filter { sekarang - it.createdAt < TTL_MS }.sortedByDescending { it.updatedAt }
        simpanDaftar()
    }

    private fun simpanDaftar() {
        try { session.setAiSessions(userId(), json.encodeToString(serializer, _sesi.value)) }
        catch (e: Exception) { Napier.e("Gagal simpan riwayat AI", e) }
    }

    private fun judul(pesan: List<AiMessage>): String {
        val awal = pesan.firstOrNull { it.role == "user" }?.content.orEmpty().trim()
        return if (awal.isBlank()) "Chat baru" else if (awal.length > 40) awal.take(40) + "…" else awal
    }

    private fun simpanSesiAktif() {
        val pesan = _pesan.value
        if (pesan.isEmpty()) return
        val id = _sesiAktifId.value
        val lama = _sesi.value.firstOrNull { it.id == id }
        val baru = AiSession(
            id = id,
            title = judul(pesan),
            createdAt = lama?.createdAt ?: System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis(),
            messages = pesan.takeLast(MAKS_PESAN)
        )
        _sesi.update { daftar ->
            (listOf(baru) + daftar.filter { it.id != id }).take(MAKS_SESI)
        }
        simpanDaftar()
    }

    fun sesiBaru() {
        simpanSesiAktif()
        _sesiAktifId.value = baruId()
        _pesan.value = emptyList()
        _saran.value = emptyList()
        _mengetikId.value = null
        _unitDipilihId.value = null
    }

    fun bukaSesi(id: String) {
        simpanSesiAktif()
        val s = _sesi.value.firstOrNull { it.id == id } ?: return
        _sesiAktifId.value = s.id
        _pesan.value = s.messages
        _saran.value = emptyList()
        _mengetikId.value = null
    }

    fun hapusSesi(id: String) {
        _sesi.update { it.filter { s -> s.id != id } }
        simpanDaftar()
        if (id == _sesiAktifId.value) {
            _sesiAktifId.value = baruId()
            _pesan.value = emptyList()
            _saran.value = emptyList()
        }
    }

    fun hapusSemuaSesi() {
        _sesi.value = emptyList()
        simpanDaftar()
        _sesiAktifId.value = baruId()
        _pesan.value = emptyList()
        _saran.value = emptyList()
    }

    /** Kosongkan percakapan aktif (tetap dalam sesi yang sama). */
    fun bersihkan() {
        val id = _sesiAktifId.value
        _pesan.value = emptyList()
        _saran.value = emptyList()
        _sesi.update { it.filter { s -> s.id != id } }
        simpanDaftar()
    }

    fun setInstan(v: Boolean) { _instan.value = v; session.setAiInstant(v) }

    fun selesaiMengetik() { _mengetikId.value = null }

    // ─── Konteks unit ────────────────────────────────────────────────────────

    /** Unit yang dipakai sebagai konteks percakapan. */
    fun unitKonteks(): BusinessUnit? {
        val id = _unitDipilihId.value
        return (if (id != null) units().firstOrNull { it.id == id } else null) ?: activeUnit()
    }

    fun pilihUnit(unitId: Int) {
        _unitDipilihId.value = unitId
        _coa.value = emptyList()
        val tertunda = _menungguUnit.value
        _menungguUnit.value = null
        if (tertunda != null) proses(tertunda)
    }

    fun batalPilihUnit() { _menungguUnit.value = null }

    // ─── Kirim pesan ─────────────────────────────────────────────────────────

    fun kirim(teks: String) {
        val pesan = teks.trim()
        if (pesan.isEmpty() || _memuat.value) return
        val butuhUnit = BISNIS.containsMatchIn(pesan) && !UMUM.containsMatchIn(pesan)
        if (butuhUnit && _unitDipilihId.value == null && units().size > 1) {
            // Akun multi-unit: tanyakan dulu unit mana yang dimaksud (sama seperti di web)
            _menungguUnit.value = pesan
            return
        }
        proses(pesan)
    }

    fun ulangiTerakhir() {
        val terakhir = _pesan.value.lastOrNull { it.role == "user" } ?: return
        // buang pesan error di ujung lalu kirim ulang tanpa menduplikasi pesan pengguna
        if (_pesan.value.lastOrNull()?.isError == true) _pesan.update { it.dropLast(1) }
        _pesan.update { it.dropLast(1) }
        proses(terakhir.content)
    }

    private fun proses(pesan: String) {
        val unit = unitKonteks()
        val butuhUnit = BISNIS.containsMatchIn(pesan) && !UMUM.containsMatchIn(pesan)
        val user = AiMessage(
            id = baruId(), role = "user", content = pesan, ts = System.currentTimeMillis(),
            unitName = if (butuhUnit) unit?.name else null
        )
        _pesan.update { it + user }
        _saran.value = emptyList()
        _memuat.value = true
        simpanSesiAktif()

        scope.launch {
            try {
                val riwayat = _pesan.value.takeLast(20)
                    .filter { !it.isError }
                    .map { ChatMessage(role = it.role, content = it.content) }
                val res = api().chat(ChatRequest(message = pesan, activeUnitSlug = unit?.slug, history = riwayat))
                val previews = res.transactionPreviews.orEmpty()
                val jawab = AiMessage(
                    id = baruId(), role = "assistant",
                    content = res.reply.ifBlank { "Maaf kak, terjadi kesalahan." },
                    ts = System.currentTimeMillis(),
                    previews = previews,
                    chartJson = res.chartData?.toString()
                )
                _pesan.update { (it + jawab).takeLast(MAKS_PESAN) }
                _saran.value = res.suggestions.ifEmpty { if (previews.isEmpty()) listOf("Ringkasan keuangan", "Bantuan fitur") else emptyList() }
                if (!_instan.value && previews.isEmpty()) _mengetikId.value = jawab.id
                if (previews.isNotEmpty() && unit != null) muatCoa(unit.id)
            } catch (e: Exception) {
                Napier.e("Chat AI gagal", e)
                _pesan.update {
                    it + AiMessage(
                        id = baruId(), role = "assistant", ts = System.currentTimeMillis(),
                        content = "Koneksi terputus. Coba lagi ya kak 🙏", isError = true
                    )
                }
            } finally {
                _memuat.value = false
                simpanSesiAktif()
            }
        }
    }

    // ─── Kartu transaksi ─────────────────────────────────────────────────────

    private suspend fun muatCoa(unitId: Int) {
        if (_coa.value.isNotEmpty() && _coa.value.first().unitId == unitId) return
        try {
            val res = api().getChartOfAccounts(unitId)
            if (res.success) _coa.value = res.data.orEmpty().filter { it.isActive == 1 }
        } catch (e: Exception) { Napier.e("Muat COA untuk AI gagal", e) }
    }

    fun akunKas(): List<ChartOfAccount> = _coa.value.filter { c ->
        c.tipeAkun.equals("ASET_LANCAR", true) &&
            listOf("kas", "bank", "transfer", "qris", "digital", "gopay", "ovo", "dana").any { c.namaAkun.contains(it, true) }
    }

    fun akunLawan(kategori: String): List<ChartOfAccount> {
        val tipe = if (kategori.equals("Masuk", true)) setOf("PENDAPATAN", "PENDAPATAN_LAINNYA")
        else setOf("BEBAN_OPERASIONAL", "BEBAN_LAINNYA", "HPP")
        return _coa.value.filter { it.tipeAkun.uppercase() in tipe }
    }

    fun simpanTransaksi(idPesan: String, indeks: Int, kasCoaId: Int, coaId: Int) {
        val msg = _pesan.value.firstOrNull { it.id == idPesan } ?: return
        val p = msg.previews.getOrNull(indeks) ?: return
        val unit = unitKonteks() ?: run { onError("Pilih unit bisnis terlebih dahulu"); return }
        val kunci = "$idPesan-$indeks"
        if (kunci in _menyimpan.value || indeks in msg.tersimpan) return
        _menyimpan.update { it + kunci }
        scope.launch {
            try {
                val req = CreateTransactionRequest(
                    TransactionBody(
                        unitId = unit.id,
                        kategoriTrx = p.kategori.uppercase(),
                        nominal = p.nominal,
                        keterangan = p.keterangan.uppercase(),
                        metodeBayar = p.metode ?: "KAS",
                        coaId = coaId,
                        kasCoaId = kasCoaId
                    )
                )
                val res = api().createTransaction(req)
                if (res.success) {
                    _pesan.update { daftar ->
                        daftar.map { if (it.id == idPesan) it.copy(tersimpan = it.tersimpan + indeks) else it }
                    }
                    simpanSesiAktif()
                    onTransaksiTersimpan()
                } else onError(res.message ?: "Gagal menyimpan transaksi")
            } catch (e: Exception) {
                onError("Koneksi gagal: ${e.message}")
            } finally {
                _menyimpan.update { it - kunci }
            }
        }
    }
}
