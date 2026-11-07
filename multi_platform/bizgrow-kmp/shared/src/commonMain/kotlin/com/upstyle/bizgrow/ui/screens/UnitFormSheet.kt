package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.BusinessUnit
import com.upstyle.bizgrow.data.CreateUnitRequest
import com.upstyle.bizgrow.data.UpdateUnitSettingsRequest
import com.upstyle.bizgrow.ui.design.*

/** Kategori usaha lengkap — kode & kelompok sama dengan web (lib/businessCategories.js). */
data class KategoriWeb(val kode: String, val label: String, val kelompok: String)

val DaftarKategoriWeb = listOf(
    KategoriWeb("FNB_RESTO", "Restoran / Warung Makan", "F&B"),
    KategoriWeb("FNB_CATERING", "Katering", "F&B"),
    KategoriWeb("FNB_COFFEE_ROASTERY", "Cafe / Kopi", "F&B"),
    KategoriWeb("FNB_BAR_CLUB", "Bar / Club", "F&B"),
    KategoriWeb("FNB_PRODUKSI", "Produksi Makanan/Minuman", "F&B"),
    KategoriWeb("FNB_FRANCHISE", "Franchise F&B", "F&B"),
    KategoriWeb("RETAIL_MINIMARKET", "Minimarket / Toko Kelontong", "Retail"),
    KategoriWeb("RETAIL_FASHION", "Fashion / Butik Pakaian", "Retail"),
    KategoriWeb("RETAIL_BEAUTY", "Kosmetik / Kecantikan", "Retail"),
    KategoriWeb("RETAIL_ELECTRONIC", "Elektronik / Gadget", "Retail"),
    KategoriWeb("RETAIL_FURNITURE", "Furnitur / Interior", "Retail"),
    KategoriWeb("RETAIL_JEWELRY", "Perhiasan / Emas", "Retail"),
    KategoriWeb("RETAIL_PETSHOP", "Pet Shop", "Retail"),
    KategoriWeb("RETAIL_SPORTS", "Olahraga / Outdoor", "Retail"),
    KategoriWeb("RETAIL_BOOKSTORE", "Toko Buku / ATK", "Retail"),
    KategoriWeb("RETAIL_PHARMACY", "Apotek", "Retail"),
    KategoriWeb("JASA_BARBER", "Barbershop / Salon", "Jasa"),
    KategoriWeb("JASA_LAUNDRY", "Laundry", "Jasa"),
    KategoriWeb("JASA_TEKNIK", "Service Elektronik / Bengkel", "Jasa"),
    KategoriWeb("JASA_KONSULTASI", "Konsultan / Advisor", "Jasa"),
    KategoriWeb("JASA_PHOTOGRAPHY", "Fotografi / Videografi", "Jasa"),
    KategoriWeb("JASA_LOGISTIK", "Logistik / Ekspedisi", "Jasa"),
    KategoriWeb("JASA_CLEANING", "Cleaning Service", "Jasa"),
    KategoriWeb("JASA_RECRUITMENT", "Rekrutmen / HR Outsource", "Jasa"),
    KategoriWeb("HEALTH_CLINIC", "Klinik / Puskesmas", "Kesehatan"),
    KategoriWeb("HEALTH_DENTAL", "Klinik Gigi", "Kesehatan"),
    KategoriWeb("HEALTH_AESTHETIC", "Klinik Estetik / Kecantikan", "Kesehatan"),
    KategoriWeb("HEALTH_VETERINARY", "Klinik Hewan", "Kesehatan"),
    KategoriWeb("TECH_SOFTWARE", "Software House / IT", "Teknologi"),
    KategoriWeb("TECH_SAAS", "SaaS / Startup Digital", "Teknologi"),
    KategoriWeb("MANUFAKTUR", "Manufaktur / Pabrik", "Industri"),
    KategoriWeb("CONSTRUCTION", "Konstruksi / Kontraktor", "Industri"),
    KategoriWeb("AGRIBISNIS", "Agribisnis / Pertanian", "Industri"),
    KategoriWeb("PROPERTY_DEV", "Properti / Developer", "Industri"),
    KategoriWeb("EDUCATION_COURSE", "Kursus / Lembaga Pendidikan", "Edukasi"),
    KategoriWeb("TOURISM_HOTEL", "Hotel / Penginapan", "Pariwisata"),
    KategoriWeb("TOURISM_TRAVEL", "Travel Agent / Wisata", "Pariwisata"),
    KategoriWeb("MEDIA_PRODUCTION", "Produksi Media / Content", "Media"),
    KategoriWeb("DEFAULT", "Bisnis Lainnya", "Lainnya"),
)

private val kataKunciKategori = listOf(
    "FNB_RESTO" to listOf("resto", "makan", "warung", "eatery", "bistro", "diner", "kitchen", "ayam", "bakso", "mie"),
    "FNB_COFFEE_ROASTERY" to listOf("cafe", "kopi", "coffee", "roastery", "kafe", "espresso"),
    "FNB_CATERING" to listOf("catering", "katering", "tumpeng"),
    "RETAIL_MINIMARKET" to listOf("mart", "toko", "kelontong", "minimarket"),
    "RETAIL_FASHION" to listOf("baju", "fashion", "boutique", "butik", "apparel", "outfit", "thrift", "hijab"),
    "JASA_TEKNIK" to listOf("bengkel", "motor", "mobil", "service", "reparasi", "otomotif", "garage"),
    "JASA_LAUNDRY" to listOf("laundry", "cuci", "dry clean", "setrika"),
    "JASA_BARBER" to listOf("salon", "barber", "pangkas", "hair", "beauty", "spa"),
    "HEALTH_CLINIC" to listOf("klinik", "sehat", "medika", "hospital", "dokter", "gigi"),
    "RETAIL_PHARMACY" to listOf("apotek", "farma", "pharmacy"),
    "TECH_SOFTWARE" to listOf("tech", "software", "digital", "code", "dev"),
    "MEDIA_PRODUCTION" to listOf("studio", "foto", "photo", "production"),
    "CONSTRUCTION" to listOf("kontraktor", "pemborong", "konstruksi"),
)

/** Tebak kategori dari nama unit (deteksi pintar yang sama dengan form web). */
fun tebakKategori(nama: String): String? {
    val n = nama.lowercase()
    if (n.length < 3) return null
    return kataKunciKategori.firstOrNull { (_, kata) -> kata.any { it in n } }?.first
}

fun labelKategori(kode: String?): String =
    DaftarKategoriWeb.firstOrNull { it.kode == kode }?.label ?: (kode ?: "-").replace("_", " ")

/** Pemilih kategori: kelompok (pil) lalu pilihan di kelompok itu (dropdown). */
@Composable
private fun PemilihKategori(terpilih: String, onPilih: (String) -> Unit) {
    val kelompokList = remember { DaftarKategoriWeb.map { it.kelompok }.distinct() }
    var kelompok by remember(terpilih) {
        mutableStateOf(DaftarKategoriWeb.firstOrNull { it.kode == terpilih }?.kelompok ?: kelompokList.first())
    }
    PilihanPil("Kelompok usaha", kelompokList.map { it to it }, kelompok) { kelompok = it }
    PilihanField(
        "Kategori bisnis *",
        DaftarKategoriWeb.filter { it.kelompok == kelompok }.map { it.kode to it.label },
        terpilih.takeIf { k -> DaftarKategoriWeb.any { it.kode == k && it.kelompok == kelompok } },
        onPilih, placeholder = "Pilih kategori…"
    )
}

/** Lembar "Bisnis baru": pusat atau cabang, kategori lengkap, alamat, kontak, modal awal. */
@Composable
fun BuatUnitSheet(units: List<BusinessUnit>, onDismiss: () -> Unit, onBuat: (CreateUnitRequest) -> Unit) {
    val induk = remember(units) { units.filter { it.isCabang != 1 } }
    var cabang by remember { mutableStateOf(false) }
    var indukId by remember { mutableStateOf<Int?>(null) }
    var nama by remember { mutableStateOf("") }
    var kategori by remember { mutableStateOf("") }
    var kategoriManual by remember { mutableStateOf(false) }
    var alamat by remember { mutableStateOf("") }
    var telepon by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var modal by remember { mutableStateOf("") }

    val indukDipilih = induk.firstOrNull { it.id == indukId }
    val valid = nama.trim().length >= 2 && alamat.isNotBlank() && (if (cabang) indukId != null else kategori.isNotBlank())

    FormSheet(
        judul = if (cabang) "Cabang baru" else "Bisnis baru",
        subjudul = if (cabang) "Cabang mengikuti kategori unit induk" else "Kategori menentukan fitur kasir & akun yang aktif otomatis",
        onDismiss = onDismiss,
        labelSimpan = if (cabang) "Buat cabang" else "Buat bisnis",
        simpanAktif = valid,
        onSimpan = {
            onBuat(
                CreateUnitRequest(
                    name = nama.trim(), type = if (cabang) null else kategori, is_cabang = cabang, cabang_dari = if (cabang) indukId else null,
                    alamat = alamat.trim(), telepon = telepon.trim().ifBlank { null }, email = email.trim().ifBlank { null },
                    modal_awal = modal.toDoubleOrNull()
                )
            )
        }
    ) {
        if (induk.isNotEmpty()) SwitchBaris("Ini cabang", "Daftarkan sebagai cabang dari unit yang sudah ada", cabang) { cabang = it }
        BizTextField(nama, {
            nama = it
            if (!kategoriManual && !cabang) tebakKategori(it)?.let { k -> kategori = k }
        }, "Nama bisnis *", leadingIcon = Icons.Rounded.Storefront, placeholder = if (cabang) "mis. Kopi Senja – Cabang Dago" else "mis. Kopi Senja")
        if (cabang) {
            PilihanField("Unit induk *", induk.map { it.id.toString() to it.name }, indukId?.toString(), { indukId = it.toIntOrNull() }, placeholder = "Pilih unit induk…")
            if (indukDipilih != null) Text("Kategori: ${labelKategori(indukDipilih.type)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            PemilihKategori(kategori) { kategori = it; kategoriManual = true }
        }
        BizTextField(alamat, { alamat = it }, "Alamat *", leadingIcon = Icons.Rounded.LocationOn, singleLine = false)
        BizTextField(telepon, { telepon = it }, "Telepon", leadingIcon = Icons.Rounded.Phone, keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone)
        BizTextField(email, { email = it }, "Email", leadingIcon = Icons.Rounded.Email, keyboardType = androidx.compose.ui.text.input.KeyboardType.Email)
        AngkaField(modal, { modal = it }, "Modal awal (Rp)", placeholder = "0", supporting = "Dipakai sebagai saldo awal kas & dasar target bulanan")
    }
}

/** Lembar ubah unit: nama, kategori (pusat), alamat, kontak, modal awal. */
@Composable
fun UbahUnitSheet(unit: BusinessUnit, onDismiss: () -> Unit, onSimpan: (UpdateUnitSettingsRequest) -> Unit) {
    var nama by remember { mutableStateOf(unit.name) }
    var kategori by remember { mutableStateOf(unit.type) }
    var alamat by remember { mutableStateOf(unit.alamat ?: "") }
    var telepon by remember { mutableStateOf(unit.telepon ?: "") }
    var email by remember { mutableStateOf(unit.email ?: "") }
    var modal by remember { mutableStateOf(if (unit.modalAwal > 0) unit.modalAwal.toLong().toString() else "") }

    FormSheet(
        judul = if (unit.isCabang == 1) "Ubah cabang" else "Ubah bisnis",
        onDismiss = onDismiss,
        simpanAktif = nama.trim().length >= 2 && (email.isBlank() || "@" in email),
        onSimpan = {
            onSimpan(
                UpdateUnitSettingsRequest(
                    unitId = unit.id, namaUnit = nama.trim(), kategori = if (unit.isCabang == 1) null else kategori.ifBlank { null },
                    alamat = alamat.trim(), telepon = telepon.trim(), email = email.trim(), modalAwal = modal.toDoubleOrNull() ?: 0.0
                )
            )
        }
    ) {
        BizTextField(nama, { nama = it }, "Nama bisnis *", leadingIcon = Icons.Rounded.Storefront)
        if (unit.isCabang != 1) PemilihKategori(kategori) { kategori = it }
        BizTextField(alamat, { alamat = it }, "Alamat", leadingIcon = Icons.Rounded.LocationOn, singleLine = false)
        BizTextField(telepon, { telepon = it }, "Telepon", leadingIcon = Icons.Rounded.Phone, keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone)
        BizTextField(email, { email = it }, "Email", leadingIcon = Icons.Rounded.Email, keyboardType = androidx.compose.ui.text.input.KeyboardType.Email)
        AngkaField(modal, { modal = it }, "Modal awal (Rp)", placeholder = "0")
    }
}
