package com.upstyle.bizgrow.api

import com.upstyle.bizgrow.data.*
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.client.request.forms.submitFormWithBinaryData
import kotlinx.serialization.json.add
import kotlinx.serialization.json.putJsonArray
import io.ktor.client.statement.HttpResponse
import io.ktor.http.*
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.todayIn
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject

class UpstyleApi(private val client: HttpClient) {

    // ─── Auth ─────────────────────────────────────────────────────────────────

    suspend fun login(req: LoginRequest): ApiResponse<LoginData> =
        client.post("api/auth/login") { setBody(req) }.body()

    suspend fun register(req: RegisterRequest): ApiResponse<Unit> =
        client.post("api/auth/register") { setBody(req) }.body()

    suspend fun loginWithGoogle(req: GoogleAuthRequest): ApiResponse<LoginData> =
        client.post("api/auth/google") { setBody(req) }.body()

    suspend fun forgotPassword(email: String): ApiResponse<Unit> =
        client.post("api/auth/forgot-password") { setBody(mapOf("email" to email)) }.body()

    suspend fun resetPassword(token: String, password: String): ApiResponse<Unit> =
        client.post("api/auth/reset-password") { setBody(mapOf("token" to token, "password" to password)) }.body()

    suspend fun logout(): ApiResponse<Unit> =
        client.post("api/auth/logout").body()

    // ─── Business Units ───────────────────────────────────────────────────────

    suspend fun getBusinessUnits(): PaginatedResponse<BusinessUnit> =
        client.get("api/app/business") { parameter("limit", 50) }.body()

    suspend fun createBusinessUnit(req: CreateBusinessRequest): ApiResponse<Unit> =
        client.post("api/app/business") { setBody(req) }.body()

    suspend fun deleteBusinessUnit(unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/business") { parameter("unitId", unitId) }.body()

    suspend fun updateUnitSettings(unitId: Int, req: UpdateUnitSettingsRequest): ApiResponse<Unit> =
        client.put("api/app/business") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    /** Link login staff: simpan (buat bila belum ada) atau buat ulang loginSlug. */
    suspend fun updatePortal(unitId: Int, buatBaru: Boolean): ApiResponse<PortalResult> =
        client.put("api/app/business") {
            setBody(UpdatePortalRequest(unitId, buatBaru, "updatePortal"))
        }.body()

    /** Link sementara (10 menit) untuk membuka slip gaji / invoice HTML di browser HP. jenis = "slip" | "invoice". */
    suspend fun linkDokumen(jenis: String, id: String, month: Int? = null, year: Int? = null, type: String? = null): ApiResponse<DokumenLink> =
        client.post("api/app/dokumen") {
            setBody(buildJsonObject {
                put("jenis", jenis); put("id", id)
                month?.let { put("month", it) }; year?.let { put("year", it) }; type?.let { put("type", it) }
            })
        }.body()

    /** Konfigurasi realtime (alamat Socket.io + token) dari backend; socketUrl kosong = realtime tidak aktif. */
    suspend fun getRealtimeConfig(unitId: Int): ApiResponse<RealtimeConfig> =
        client.get("api/app/realtime") { parameter("unitId", unitId) }.body()

    // ─── Finance ──────────────────────────────────────────────────────────────

    suspend fun getFinanceData(unitId: Int, startDate: String? = null, endDate: String? = null): ApiResponse<FinanceData> =
        client.get("api/app/finance") {
            parameter("unitId", unitId)
            startDate?.let { parameter("start", it) }
            endDate?.let { parameter("end", it) }
        }.body()

    /** Riwayat transaksi dengan filter server + paginasi (offset = jumlah baris yang sudah dimuat). */
    suspend fun getRiwayatTransaksi(unitId: Int, f: RiwayatFilter, offset: Int = 0, limit: Int = 50): ApiResponse<FinanceData> =
        client.get("api/app/finance") {
            parameter("unitId", unitId)
            f.start?.let { parameter("start", it) }
            f.end?.let { parameter("end", it) }
            if (f.jenis.isNotBlank()) parameter("jenis", f.jenis)
            if (f.q.isNotBlank()) parameter("q", f.q)
            if (f.abcId > 0) parameter("abcId", f.abcId)
            parameter("urut", f.urut)
            parameter("limit", limit)
            parameter("offset", offset)
        }.body()

    suspend fun createTransaction(req: CreateTransactionRequest): ApiResponse<TransaksiTersimpan> =
        client.post("api/app/finance") { setBody(req) }.body()

    suspend fun deleteTransaction(transactionId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/finance") {
            parameter("transactionId", transactionId)
            parameter("unitId", unitId)
        }.body()

    // ─── Products ─────────────────────────────────────────────────────────────

    suspend fun getProducts(unitId: Int, page: Int = 1): PaginatedResponse<Product> =
        client.get("api/app/products") {
            parameter("unitId", unitId)
            parameter("page", page)
            parameter("limit", 50)
        }.body()

    /** Unggah foto produk (multipart) → URL publik, atau null bila gagal. */
    suspend fun uploadFotoProduk(bytes: ByteArray, namaFile: String = "produk.jpg"): String? {
        val res: JsonObject = client.submitFormWithBinaryData(
            url = "api/uploads/product-image",
            formData = io.ktor.client.request.forms.formData {
                append("image", bytes, io.ktor.http.Headers.build {
                    append(io.ktor.http.HttpHeaders.ContentType, "image/jpeg")
                    append(io.ktor.http.HttpHeaders.ContentDisposition, "filename=\"$namaFile\"")
                })
            }
        ).body()
        return res["data"]?.jsonObject?.get("url")?.jsonPrimitive?.contentOrNull
    }

    /** Simpan produk dari form lengkap: tambah (varian ikut) atau ubah. kategoriId null saat ubah = lepas kategori. */
    suspend fun simpanProdukForm(unitId: Int, f: ProdukForm, id: String?): ApiResponse<JsonObject> =
        client.request("api/app/products") {
            method = if (id == null) io.ktor.http.HttpMethod.Post else io.ktor.http.HttpMethod.Put
            setBody(buildJsonObject {
                put("id", id ?: "0")
                put("unitId", unitId)
                put("nama", f.nama)
                put("jenis", f.jenis)
                put("sku", f.sku)
                put("hargaBeli", f.hargaBeli)
                put("hargaJual", f.hargaJual)
                put("stok", f.stok)
                put("minStok", f.minStok)
                put("barcode", f.barcode.ifBlank { null })
                if (f.kategoriBaru.isNotBlank()) put("kategori", f.kategoriBaru.trim())
                else if (id != null || f.kategoriId != null) put("kategoriId", f.kategoriId)
                if (f.foto != null || id != null) put("foto", f.foto)
                if (id == null && f.varian.isNotEmpty()) {
                    putJsonArray("variants") {
                        f.varian.forEach { v ->
                            add(buildJsonObject {
                                put("namaVariasi", v.namaVariasi); put("sku", v.sku)
                                put("hargaBeli", v.hargaBeli); put("hargaJual", v.hargaJual); put("stok", v.stok)
                            })
                        }
                    }
                }
            })
        }.body()

    suspend fun createProduct(product: Product): ApiResponse<Unit> =
        client.post("api/app/products") { setBody(product) }.body()

    suspend fun updateProduct(product: Product): ApiResponse<Unit> =
        client.put("api/app/products") { setBody(product) }.body()

    suspend fun deleteProduct(productId: String): ApiResponse<Unit> =
        client.delete("api/app/products") { parameter("productId", productId) }.body()

    suspend fun getKategoriProduk(unitId: Int): ApiResponse<List<KategoriProduk>> =
        client.get("api/app/products/categories") {
            parameter("unitId", unitId)
        }.body()

    suspend fun buatKategoriProduk(unitId: Int, nama: String): ApiResponse<JsonObject> =
        client.post("api/app/products/categories") {
            setBody(buildJsonObject { put("unitId", unitId); put("namaKategori", nama) })
        }.body()

    suspend fun hapusKategoriProduk(id: Int): ApiResponse<JsonObject> =
        client.delete("api/app/products/categories") { parameter("categoryId", id) }.body()

    suspend fun getStockLogs(unitId: Int, productId: String? = null): ApiResponse<List<StockLog>> =
        client.get("api/app/products") {
            parameter("unitId", unitId)
            parameter("action", "stock-logs")
            productId?.let { parameter("productId", it) }
        }.body()

    suspend fun adjustStock(
        productId: String,
        unitId: Int,
        perubahan: Int,
        alasan: String,
        keterangan: String? = null
    ): ApiResponse<Unit> =
        client.post("api/app/products") {
            setBody(mapOf(
                "action" to "adjust-stock",
                "productId" to productId,
                "unitId" to unitId,
                "perubahan" to perubahan,
                "alasan" to alasan,
                "keterangan" to (keterangan ?: "")
            ))
        }.body()

    // ─── POS ──────────────────────────────────────────────────────────────────

    suspend fun getPosData(unitId: Int): ApiResponse<PosData> =
        client.get("api/app/pos") { parameter("unitId", unitId) }.body()

    suspend fun checkout(req: CheckoutRequest): ApiResponse<Unit> =
        client.post("api/app/pos") { setBody(req) }.body()

    suspend fun createPosCustomer(req: CreateCustomerRequest): ApiResponse<Unit> =
        client.post("api/app/pos") { setBody(req) }.body()

    // ─── HR ───────────────────────────────────────────────────────────────────

    suspend fun getHrData(unitId: Int): ApiResponse<HrData> =
        client.get("api/app/hr") { parameter("unitId", unitId) }.body()

    suspend fun createEmployee(req: CreateEmployeeRequest): ApiResponse<Unit> =
        client.post("api/app/hr") { setBody(req) }.body()

    suspend fun updateEmployee(employeeId: Int, data: Map<String, String>): ApiResponse<Unit> =
        client.put("api/app/hr") {
            parameter("employeeId", employeeId)
            setBody(data)
        }.body()

    suspend fun deleteEmployee(employeeId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/hr") {
            parameter("employeeId", employeeId)
            parameter("unitId", unitId)
        }.body()

    suspend fun checkIn(req: CheckInRequest): ApiResponse<Unit> =
        client.post("api/app/hr") { setBody(req) }.body()

    suspend fun checkOut(req: CheckOutRequest): ApiResponse<Unit> =
        client.post("api/app/hr") { setBody(req) }.body()

    suspend fun processPayroll(req: ProcessPayrollRequest): ApiResponse<Unit> =
        client.post("api/app/hr") { setBody(req) }.body()

    suspend fun getSlipGaji(employeeId: Int, periodMonth: Int, periodYear: Int): ApiResponse<Map<String, Any>> =
        client.get("api/slip-gaji/$employeeId") {
            parameter("periodMonth", periodMonth)
            parameter("periodYear", periodYear)
        }.body()

    // ─── CRM ──────────────────────────────────────────────────────────────────

    suspend fun getCrmContacts(unitId: Int, page: Int = 1): PaginatedResponse<CrmContact> =
        client.get("api/app/crm") {
            parameter("unitId", unitId)
            parameter("type", "contacts")
            parameter("limit", 100); parameter("page", page)
        }.body()

    suspend fun createContact(req: CreateContactRequest): ApiResponse<Unit> =
        client.post("api/app/crm") { setBody(req) }.body()

    suspend fun getCrmDeals(unitId: Int, page: Int = 1): PaginatedResponse<CrmDeal> =
        client.get("api/app/crm") { parameter("unitId", unitId); parameter("limit", 100); parameter("page", page) }.body()

    /** Ubah nama / nilai deal (tahap tetap lewat [updateDealStage]). */
    suspend fun ubahDeal(dealId: Int, namaDeal: String, nilai: Double): ApiResponse<JsonObject> =
        client.put("api/app/crm") {
            setBody(buildJsonObject { put("dealId", dealId); put("namaDeal", namaDeal); put("nilai", nilai) })
        }.body()

    suspend fun ubahKontak(contactId: Int, nama: String, telepon: String, email: String, perusahaan: String, stage: String): ApiResponse<JsonObject> =
        client.put("api/app/crm/contacts/$contactId") {
            setBody(buildJsonObject { put("nama", nama); put("telepon", telepon); put("email", email); put("perusahaan", perusahaan); put("stage", stage) })
        }.body()

    suspend fun hapusKontak(contactId: Int): ApiResponse<JsonObject> =
        client.delete("api/app/crm/contacts/$contactId").body()

    suspend fun buatTugasCrm(unitId: Int, deskripsi: String, kontakId: Int?, dealId: Int?, deadline: String?): ApiResponse<JsonObject> =
        client.post("api/app/crm/tasks") {
            setBody(buildJsonObject {
                put("unitId", unitId); put("deskripsi", deskripsi)
                if (kontakId != null) put("kontakId", kontakId)
                if (dealId != null) put("dealId", dealId)
                if (!deadline.isNullOrBlank()) put("deadline", deadline)
            })
        }.body()

    suspend fun ubahTugasCrm(taskId: Int, status: String? = null, deskripsi: String? = null, deadline: String? = null): ApiResponse<JsonObject> =
        client.put("api/app/crm/tasks") {
            setBody(buildJsonObject {
                put("taskId", taskId)
                if (status != null) put("status", status)
                if (deskripsi != null) put("deskripsi", deskripsi)
                if (deadline != null) put("deadline", deadline)
            })
        }.body()

    suspend fun hapusTugasCrm(taskId: Int): ApiResponse<JsonObject> =
        client.delete("api/app/crm/tasks") { parameter("taskId", taskId) }.body()

    suspend fun createDeal(req: CreateDealRequest): ApiResponse<Unit> =
        client.post("api/app/crm") { setBody(req) }.body()

    suspend fun updateDealStage(req: UpdateDealStageRequest): ApiResponse<Unit> =
        client.put("api/app/crm") { setBody(req) }.body()

    suspend fun deleteDeal(dealId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/crm") {
            parameter("dealId", dealId)
            parameter("unitId", unitId)
        }.body()

    // Aktivitas CRM → api/app/crm/activities
    suspend fun getCrmActivities(unitId: Int, kontakId: Int? = null): ApiResponse<List<CrmActivity>> =
        client.get("api/app/crm/activities") {
            parameter("unitId", unitId)
            kontakId?.let { parameter("kontakId", it) }
        }.body()

    suspend fun createActivity(req: CreateActivityRequest): ApiResponse<Unit> =
        tanpaData(client.post("api/app/crm/activities") { setBody(req) }.body())

    // ─── SCM ──────────────────────────────────────────────────────────────────

    suspend fun getScmData(unitId: Int): ApiResponse<ScmData> =
        client.get("api/app/scm") { parameter("unitId", unitId) }.body()

    suspend fun getLaporanPembelian(unitId: Int, dari: String, sampai: String): ApiResponse<LaporanPembelian> =
        client.get("api/app/scm/laporan") {
            parameter("unitId", unitId); parameter("dari", dari); parameter("sampai", sampai)
        }.body()

    /** PO lengkap (banyak barang, diskon, ongkir, PPN, perkiraan tiba, catatan). */
    suspend fun buatPoLengkap(unitId: Int, supplierId: String, items: List<Triple<String, Int, Double>>, diskon: Double, ongkir: Double, ppnPersen: Double, expectedDate: String?, catatan: String?): ApiResponse<JsonObject> =
        client.post("api/app/scm") {
            setBody(buildJsonObject {
                put("action", "create-po-lengkap")
                putJsonObject("po") {
                    put("unitId", unitId); put("supplierId", supplierId)
                    put("diskon", diskon); put("ongkir", ongkir); put("ppnPersen", ppnPersen)
                    if (!expectedDate.isNullOrBlank()) put("expectedDate", expectedDate)
                    if (!catatan.isNullOrBlank()) put("notes", catatan)
                    putJsonArray("items") { items.forEach { (p, q, h) -> add(buildJsonObject { put("productId", p); put("qty", q); put("unitPrice", h) }) } }
                }
            })
        }.body()

    suspend fun ubahSupplier(supplierId: String, nama: String, kontak: String, telp: String, email: String, alamat: String, kategori: String, npwp: String, termin: Int): ApiResponse<JsonObject> =
        client.put("api/app/scm") {
            setBody(buildJsonObject {
                put("action", "update-supplier"); put("supplierId", supplierId)
                putJsonObject("supplier") {
                    put("namaSupplier", nama); put("contactName", kontak); put("phone", telp); put("email", email)
                    put("address", alamat); put("category", kategori); put("npwp", npwp); put("termPembayaran", termin)
                }
            })
        }.body()

    suspend fun aturSupplierAktif(supplierId: String, aktif: Boolean): ApiResponse<JsonObject> =
        client.put("api/app/scm") {
            setBody(buildJsonObject { put("action", "set-supplier-aktif"); put("supplierId", supplierId); put("aktif", aktif) })
        }.body()

    suspend fun createSupplier(req: CreateSupplierRequest): ApiResponse<Unit> =
        client.post("api/app/scm") { setBody(req) }.body()

    suspend fun getPoDetail(poId: Int): ApiResponse<PoDetail> =
        client.get("api/app/scm/po") { parameter("poId", poId) }.body()

    /** Aksi PO: kirim | batal | tutup | terima | tagih | bayar | retur. [tambahan] diisi sesuai aksi. */
    suspend fun aksiPo(poId: Int, aksi: String, tambahan: JsonObject = JsonObject(emptyMap())): ApiResponse<Unit> =
        tanpaData(client.post("api/app/scm/po") {
            setBody(JsonObject(tambahan + mapOf("poId" to kotlinx.serialization.json.JsonPrimitive(poId), "action" to kotlinx.serialization.json.JsonPrimitive(aksi))))
        }.body())

    suspend fun createPurchaseOrder(req: CreatePoRequest): ApiResponse<Unit> =
        client.post("api/app/scm") { setBody(req) }.body()

    suspend fun updatePoStatus(req: UpdatePoStatusRequest): ApiResponse<Unit> =
        client.put("api/app/scm") { setBody(req) }.body()

    suspend fun deleteSupplier(supplierId: String, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/scm") {
            parameter("supplierId", supplierId)
            parameter("unitId", unitId)
        }.body()

    // ─── Finance AR (Piutang) ─────────────────────────────────────────────────

    suspend fun getReceivables(unitId: Int): ApiResponse<List<Receivable>> =
        client.get("api/app/finance/receivables") {
            parameter("unitId", unitId)
        }.body()

    suspend fun createReceivable(unitId: Int, req: CreateReceivableRequest): ApiResponse<Unit> =
        client.post("api/app/finance/receivables") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    suspend fun payReceivable(req: PayInvoiceRequest): ApiResponse<Unit> =
        client.put("api/app/finance/receivables") {
            setBody(buildJsonObject { put("action", "pay"); put("invoiceId", req.invoiceId); put("nominalBayar", req.nominalBayar); req.kasCoaId?.let { put("kasCoaId", it) } })
        }.body()

    // ─── Finance AP (Hutang) ──────────────────────────────────────────────────

    suspend fun getPayables(unitId: Int): ApiResponse<List<Payable>> =
        client.get("api/app/finance/payables") {
            parameter("unitId", unitId)
        }.body()

    suspend fun createPayable(unitId: Int, req: CreatePayableRequest): ApiResponse<Unit> =
        client.post("api/app/finance/payables") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    suspend fun payPayable(req: PayInvoiceRequest): ApiResponse<Unit> =
        client.put("api/app/finance/payables") {
            setBody(buildJsonObject { put("action", "pay"); put("invoiceId", req.invoiceId); put("nominalBayar", req.nominalBayar); req.kasCoaId?.let { put("kasCoaId", it) } })
        }.body()

    // ─── Accounting Contacts ──────────────────────────────────────────────────

    suspend fun getAccountingContacts(unitId: Int): ApiResponse<List<AccountingContact>> =
        client.get("api/app/finance/contacts") {
            parameter("unitId", unitId)
        }.body()

    suspend fun createAccountingContact(unitId: Int, contact: AccountingContact): ApiResponse<Unit> =
        client.post("api/app/finance/contacts") {
            parameter("unitId", unitId)
            setBody(contact)
        }.body()

    suspend fun simpanKontakAkuntansi(unitId: Int, c: AccountingContact): ApiResponse<Unit> {
        val isi = buildJsonObject {
            if (c.id != 0) put("contactId", c.id)
            put("unitId", unitId)
            put("namaKontak", c.namaKontak)
            put("tipeKontak", c.tipeKontak.uppercase())
            put("email", c.email ?: "")
            put("telepon", c.telepon ?: "")
            put("alamat", c.alamat ?: "")
            put("npwp", c.npwp ?: "")
            put("limitKredit", c.limitKredit)
            put("termPembayaran", c.termPembayaran)
        }
        return tanpaData(if (c.id == 0) client.post("api/app/finance/contacts") { setBody(isi) }.body()
        else client.put("api/app/finance/contacts") { setBody(isi) }.body())
    }

    suspend fun hapusKontakAkuntansi(unitId: Int, id: Int): ApiResponse<Unit> =
        tanpaData(client.delete("api/app/finance/contacts") { parameter("contactId", id); parameter("unitId", unitId) }.body())

    // ─── Journal / Jurnal Umum ────────────────────────────────────────────────

    suspend fun getJournalEntries(unitId: Int, tahun: Int? = null, bulan: String? = null): ApiResponse<List<JournalEntry>> =
        client.get("api/app/finance/journal") {
            parameter("unitId", unitId)
            tahun?.let { parameter("tahun", it) }
            bulan?.let { parameter("bulan", it) }
        }.body()

    suspend fun createJournalEntry(unitId: Int, req: CreateJournalRequest): ApiResponse<Unit> =
        client.post("api/app/finance/journal") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    // ─── Chart of Accounts ────────────────────────────────────────────────────

    suspend fun getChartOfAccounts(unitId: Int): ApiResponse<List<ChartOfAccount>> =
        client.get("api/app/finance/coa") {
            parameter("unitId", unitId)
        }.body()

    // ─── Buku Besar ───────────────────────────────────────────────────────────

    suspend fun getBukuBesar(unitId: Int, coaId: Int, tahun: Int? = null, bulan: Int? = null): ApiResponse<BukuBesarData> =
        client.get("api/app/finance/buku-besar") {
            parameter("unitId", unitId)
            parameter("coaId", coaId)
            tahun?.let { parameter("tahun", it) }
            bulan?.let { parameter("bulan", it) }
        }.body()

    // ─── Laporan ──────────────────────────────────────────────────────────────

    suspend fun getLabaRugi(unitId: Int, startDate: String, endDate: String): ApiResponse<LabaRugiData> =
        client.get("api/app/finance/laporan") {
            parameter("unitId", unitId)
            parameter("type", "laba-rugi")
            parameter("start", startDate)
            parameter("end", endDate)
        }.body()

    /** Laporan lengkap (dashboard analisis + laba rugi + neraca). bulan = "all" atau 1..12. */
    suspend fun getLaporanLengkap(unitId: Int, tahun: Int, bulan: String): ApiResponse<LaporanLengkap> =
        client.get("api/app/finance/laporan") {
            parameter("unitId", unitId)
            parameter("type", "report")
            parameter("tahun", tahun)
            parameter("bulan", bulan)
        }.body()

    suspend fun getArusKas(unitId: Int, startDate: String, endDate: String): ApiResponse<ArusKasData> =
        client.get("api/app/finance/laporan") {
            parameter("unitId", unitId)
            parameter("type", "arus-kas")
            parameter("start", startDate)
            parameter("end", endDate)
        }.body()

    // ─── Ecommerce Orders ─────────────────────────────────────────────────────

    suspend fun getOrders(unitId: Int, page: Int = 1): PaginatedResponse<EcommerceOrder> =
        client.get("api/app/orders") {
            parameter("unitId", unitId)
            parameter("page", page)
            parameter("limit", 20)
        }.body()

    suspend fun getOrderDetail(orderId: Int): ApiResponse<EcommerceOrder> =
        client.get("api/app/orders/$orderId").body()

    suspend fun updateOrderStatus(orderId: Int, status: String): ApiResponse<Unit> =
        client.put("api/app/orders/$orderId") {
            setBody(mapOf("status" to status))
        }.body()

    /** Ubah status bayar dan/atau kirim pesanan toko online (nilai enum web). */
    suspend fun ubahStatusPesanan(orderId: Int, paymentStatus: String? = null, shippingStatus: String? = null): ApiResponse<Unit> =
        client.put("api/app/orders/$orderId") {
            setBody(buildJsonObject {
                if (paymentStatus != null) put("paymentStatus", paymentStatus)
                if (shippingStatus != null) put("shippingStatus", shippingStatus)
            })
        }.body()

    // ─── CS / Support Tickets ─────────────────────────────────────────────────

    suspend fun getTickets(unitId: Int): ApiResponse<List<SupportTicket>> =
        client.get("api/app/cs") {
            parameter("unitId", unitId)
        }.body()

    suspend fun createTicket(req: CreateTicketRequest): ApiResponse<Unit> =
        client.post("api/app/cs") { setBody(req) }.body()

    suspend fun getTicketMessages(ticketId: Int): ApiResponse<List<TicketMessage>> =
        client.get("api/app/cs/$ticketId/messages").body()

    suspend fun replyTicket(ticketId: Int, message: String): ApiResponse<Unit> =
        client.post("api/app/cs/$ticketId/reply") {
            setBody(mapOf("message" to message))
        }.body()

    suspend fun updateTicketStatus(ticketId: Int, status: String): ApiResponse<Unit> =
        client.put("api/app/cs/$ticketId") {
            setBody(mapOf("status" to status))
        }.body()

    suspend fun updateTicketPriority(ticketId: Int, priority: String): ApiResponse<Unit> =
        client.put("api/app/cs/$ticketId") {
            setBody(mapOf("priority" to priority))
        }.body()

    // ─── Notifications ────────────────────────────────────────────────────────

    /** Notifikasi semua unit milik user (seperti lonceng web); [before] = id terkecil yang sudah dimuat. */
    suspend fun getNotifications(limit: Int = 30, before: Int? = null): ApiResponse<List<RiwayatAksi>> =
        client.get("api/app/notifications") {
            parameter("limit", limit)
            before?.let { parameter("before", it) }
        }.body()

    suspend fun markNotificationRead(notifId: Int): ApiResponse<Unit> =
        client.put("api/app/notifications/$notifId/read").body()

    suspend fun markAllNotificationsRead(): ApiResponse<Unit> =
        client.put("api/app/notifications/read-all").body()

    // ─── AI Chat ──────────────────────────────────────────────────────────────

    suspend fun chat(req: ChatRequest): ChatResponse =
        client.post("api/chat") { setBody(req) }.body()

    suspend fun aiAdvisor(req: AiAdvisorRequest): ApiResponse<AiAdvisorData> =
        client.post("api/ai-advisor") { setBody(req) }.body()

    /** NLP transaction entry — POST /api/app/ai-entry */
    suspend fun aiEntry(req: AiEntryRequest): ApiResponse<AiEntryData> =
        client.post("api/app/ai-entry") { setBody(req) }.body()

    /** AI kategori suggestion — POST /api/ai-kategori */
    suspend fun aiKategori(req: AiKategoriRequest): ApiResponse<AiKategoriResult> =
        client.post("api/ai-kategori") { setBody(req) }.body()

    // ─── Reports & Exports ────────────────────────────────────────────────────

    suspend fun getLaporanWa(req: LaporanWaRequest): ApiResponse<LaporanWaData> =
        client.post("api/laporan-wa") { setBody(req) }.body()

    suspend fun getLowStock(unitId: Int): ApiResponse<List<LowStockProduct>> =
        client.get("api/low-stock") { parameter("unitId", unitId) }.body()

    suspend fun getUpdates(slug: String, lastUpdate: Long): Map<String, Any> =
        client.get("api/updates") {
            parameter("slug", slug)
            parameter("lastUpdate", lastUpdate)
        }.body()

    // Sinkron offline memakai opsi B (kirim ulang ke API biasa) — tidak ada penyelesaian bentrok di server.
    suspend fun resolveConflict(
        entityType: String,
        entityId: String,
        resolution: String // "local" | "remote"
    ): ApiResponse<Unit> = ApiResponse(true, "Tidak ada bentrok: perubahan offline dikirim ulang apa adanya")

    // ─── Subscription & Billing (unitId-scoped) ───────────────────────────────

    suspend fun getBillingPlans(): ApiResponse<List<SubscriptionPlan>> =
        client.get("api/app/billing/plans").body()

    suspend fun getCurrentSubscription(unitId: Int): ApiResponse<CurrentSubscription> =
        client.get("api/app/billing/subscription") { parameter("unitId", unitId) }.body()

    suspend fun getUsageMetrics(unitId: Int): ApiResponse<UsageMetrics> =
        client.get("api/app/billing/usage") { parameter("unitId", unitId) }.body()

    suspend fun getBillingInvoices(unitId: Int): ApiResponse<List<Invoice>> =
        client.get("api/app/billing/invoices") { parameter("unitId", unitId) }.body()

    /** Buat transaksi Midtrans Snap untuk naik paket (sama dengan tombol upgrade di web). Buka redirectUrl untuk bayar. */
    suspend fun initBillingPaymentSession(unitId: Int, req: PaymentRequest): ApiResponse<PaymentSession> =
        client.post("api/app/billing/upgrade") {
            setBody(buildJsonObject { put("planId", req.planId.lowercase()) })
        }.body()

    suspend fun confirmBillingPayment(sessionId: String): ApiResponse<PaymentResult> =
        client.post("api/app/billing/payment/confirm") {
            setBody(mapOf("sessionId" to sessionId))
        }.body()

    /** Naik paket: hasilnya PENDING sampai pembayaran di Midtrans selesai (lihat initBillingPaymentSession). */
    suspend fun upgradePlan(unitId: Int, planId: String, req: PaymentRequest): ApiResponse<PaymentResult> =
        upgradePlan(planId, req.paymentMethod)

    // Turun paket tidak tersedia lewat sistem (sama dengan web) — hubungi support
    suspend fun downgradePlan(unitId: Int, planId: String): ApiResponse<Unit> =
        ApiResponse(false, "Turun paket belum bisa lewat aplikasi. Hubungi support Bizgrow.", null, "DOWNGRADE_NOT_ALLOWED")

    // ─── Product Variants (unitId-scoped) ─────────────────────────────────────

    suspend fun getProductVariants(unitId: Int, productId: String): ApiResponse<List<ProductVariant>> =
        client.get("api/app/products/variants") {
            parameter("unitId", unitId)
            parameter("productId", productId)
        }.body()

    suspend fun createVariant(unitId: Int, variant: ProductVariant): ApiResponse<Unit> =
        client.post("api/app/products/variants") {
            parameter("unitId", unitId)
            setBody(variant)
        }.body()

    suspend fun updateVariant(unitId: Int, variant: ProductVariant): ApiResponse<Unit> =
        client.put("api/app/products/variants") {
            parameter("unitId", unitId)
            setBody(variant)
        }.body()

    suspend fun deleteVariant(unitId: Int, variantId: String): ApiResponse<Unit> =
        client.delete("api/app/products/variants") {
            parameter("unitId", unitId)
            parameter("variantId", variantId)
        }.body()

    suspend fun getStockMovements(unitId: Int, productId: String): ApiResponse<List<StockMovement>> =
        client.get("api/app/products/stock-movements") {
            parameter("unitId", unitId)
            parameter("productId", productId)
        }.body()

    suspend fun bulkUpdateProducts(unitId: Int, operation: BulkOperation): ApiResponse<BulkOperationResult> =
        client.post("api/app/products/bulk") {
            parameter("unitId", unitId)
            setBody(operation)
        }.body()

    // Strategi harga: sama seperti kalkulator harga di web, hasilnya langsung jadi harga jual
    // (tidak ada daftar strategi yang disimpan di server).
    suspend fun getPricingStrategies(unitId: Int, productId: String): ApiResponse<List<PricingStrategy>> =
        ApiResponse(true, null, emptyList())

    /** type: FIXED (harga jual) | PERCENTAGE (markup % dari harga beli) | MARGIN (% margin) */
    suspend fun applyPricingStrategy(unitId: Int, strategy: PricingStrategy): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.post("api/app/products/pricing") {
            parameter("unitId", unitId)
            setBody(buildJsonObject {
                put("productId", strategy.productId)
                put("type", strategy.type)
                put("value", strategy.value)
            })
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    suspend fun deletePricingStrategy(unitId: Int, strategyId: String): ApiResponse<Unit> =
        ApiResponse(false, "Strategi harga tidak disimpan — harga sudah langsung diterapkan ke produk")

    suspend fun rollbackBulkOperation(unitId: Int, operationId: String): ApiResponse<Unit> =
        client.post("api/app/products/bulk/rollback") {
            parameter("unitId", unitId)
            setBody(mapOf("operationId" to operationId))
        }.body()

    // ─── Export / Import (unitId-scoped) ──────────────────────────────────────

    /** dataType: products | finance | customers — format: excel | csv | pdf (pdf hanya finance).
     *  Balasan berisi downloadUrl (berlaku 10 menit) yang bisa dibuka di browser HP. */
    suspend fun exportData(unitId: Int, dataType: String, format: String, startDate: String? = null, endDate: String? = null): ApiResponse<ExportResult> =
        client.post("api/app/export") {
            setBody(buildJsonObject {
                put("unitId", unitId)
                put("dataType", dataType)
                put("format", format)
                startDate?.let { put("startDate", it) }
                endDate?.let { put("endDate", it) }
            })
        }.body()

    suspend fun validateImportFile(unitId: Int, dataType: String, fileBase64: String, fileName: String): ApiResponse<ImportValidationResult> =
        client.post("api/app/import/validate") {
            setBody(mapOf("unitId" to unitId.toString(), "dataType" to dataType, "fileBase64" to fileBase64, "fileName" to fileName))
        }.body()

    suspend fun importData(unitId: Int, dataType: String, fileBase64: String, fileName: String): ApiResponse<ImportResult> =
        client.post("api/app/import") {
            setBody(mapOf("unitId" to unitId.toString(), "dataType" to dataType, "fileBase64" to fileBase64, "fileName" to fileName))
        }.body()

    // ─── Help & Diagnostics (extended) ────────────────────────────────────────

    suspend fun getHelpArticles(screenName: String, lang: String = "id"): ApiResponse<List<HelpArticle>> =
        getContextualHelp(screenName)

    // FAQ bantuan → api/app/help (item q/a)
    suspend fun getHelpFaqs(category: String? = null, lang: String = "id"): ApiResponse<List<HelpFaqItem>> =
        ambilFaq(category).mapData { list -> list.map { HelpFaqItem(id = it.id.toString(), question = it.q, answer = it.a, category = it.category) } }

    private suspend fun ambilFaq(category: String?): ApiResponse<List<HelpItemDto>> {
        val res: ApiResponse<HelpListDto> = client.get("api/app/help") {
            category?.takeIf { it.isNotBlank() }?.let { parameter("category", it) }
        }.body()
        return res.mapData { it.items }
    }

    suspend fun submitTicket(unitId: Int, req: SubmitTicketRequest): ApiResponse<Unit> =
        kirimTiketBantuan(req.title, req.description, req.priority, unitId)


    suspend fun runDiagnostics(unitId: Int): ApiResponse<DiagnosticResult> =
        client.post("api/app/help/diagnostics") {
            setBody(mapOf("unitId" to unitId.toString()))
        }.body()

    // ─── Sync Queue (unitId-scoped) ───────────────────────────────────────────

    /**
     * Kirim ulang SATU item antrean offline ke endpoint aslinya (opsi B), dengan Idempotency-Key = item.id.
     * - terkirim: server menerima (2xx)
     * - ditolakPermanen: 4xx selain 408/429 — data tidak valid, jangan dicoba lagi
     * - selain itu (jaringan putus / 5xx): biarkan di antrean untuk dicoba lagi
     */
    suspend fun replaySyncItem(item: SyncQueueItem): HasilKirimAntrean {
        if (item.path.isBlank()) return HasilKirimAntrean(terkirim = false, ditolakPermanen = true, pesan = "Item antrean lama tanpa alamat endpoint")
        val res: HttpResponse = client.request(item.path) {
            method = HttpMethod.parse(item.method.uppercase())
            header("Idempotency-Key", item.id)
            if (item.payload.isNotBlank()) setBody(Json.parseToJsonElement(item.payload))
        }
        val kode = res.status.value
        val pesan = runCatching { res.body<ApiResponse<JsonElement>>().message }.getOrNull()
        return when {
            kode in 200..299 -> HasilKirimAntrean(terkirim = true, ditolakPermanen = false, pesan = pesan)
            kode in 400..499 && kode != 408 && kode != 429 && kode != 401 && kode != 409 ->
                HasilKirimAntrean(terkirim = false, ditolakPermanen = true, pesan = pesan ?: "Ditolak server ($kode)")
            else -> HasilKirimAntrean(terkirim = false, ditolakPermanen = false, pesan = pesan)
        }
    }

    /** Kompatibilitas: kirim semua item satu per satu; sukses kalau semua sudah selesai diproses. */
    suspend fun flushSyncQueue(unitId: Int, items: List<SyncQueueItem>): ApiResponse<Unit> {
        for (item in items) {
            val hasil = replaySyncItem(item)
            if (!hasil.terkirim && !hasil.ditolakPermanen) return ApiResponse(false, hasil.pesan ?: "Belum bisa sinkron, coba lagi nanti")
        }
        return ApiResponse(true, "Antrean offline terkirim")
    }

    suspend fun resolveConflict(unitId: Int, entityType: String, entityId: String, resolution: String): ApiResponse<Unit> =
        resolveConflict(entityType, entityId, resolution)

    // ─── Billing overloads (unitId-scoped, canonical names) ───────────────────

    /** Returns invoices scoped to a specific business unit. */
    suspend fun getInvoices(unitId: Int): ApiResponse<List<Invoice>> =
        client.get("api/app/billing/invoices") { parameter("unitId", unitId) }.body()

    /** Initialises a payment session (Midtrans Snap) — paket berlaku per akun, bukan per unit. */
    suspend fun initPaymentSession(unitId: Int, req: PaymentRequest): ApiResponse<PaymentSession> =
        initBillingPaymentSession(unitId, req)

    // ─── Help overloads (HelpFaq return type, unitId-scoped ticket) ───────────

    /**
     * Returns FAQs as [HelpFaq] (UI alias). Use [getHelpFaqs] for the
     * serializable [HelpFaqItem] variant.
     */
    suspend fun getHelpFaqsUi(category: String? = null, lang: String = "id"): ApiResponse<List<HelpFaq>> =
        ambilFaq(category).mapData { list -> list.map { HelpFaq(id = it.id.toString(), question = it.q, answer = it.a, category = it.category) } }

    /** Submits a support ticket using the lightweight [SubmitTicketRequest] form. */
    suspend fun submitSupportTicket(unitId: Int, req: SubmitTicketRequest): ApiResponse<Unit> =
        kirimTiketBantuan(req.title, req.description, req.priority, unitId)

    // ─── Alias / overload helpers for AppViewModel call-site compatibility ────

    /** Alias for [getBusinessUnits] — AppViewModel calls `getUnits()`. */
    suspend fun getUnits(): PaginatedResponse<BusinessUnit> = getBusinessUnits()

    /** Alias for [getBillingPlans] — AppViewModel calls `getSubscriptionPlans()`. */
    suspend fun getSubscriptionPlans(): ApiResponse<List<SubscriptionPlan>> = getBillingPlans()

    /** Overload without unitId — reads active unit from state; AppViewModel calls `getCurrentSubscription()`. */
    suspend fun getCurrentSubscription(): ApiResponse<CurrentSubscription> =
        client.get("api/app/billing/subscription").body()

    /** Overload without unitId — AppViewModel calls `getUsageMetrics()`. */
    suspend fun getUsageMetrics(): ApiResponse<UsageMetrics> =
        client.get("api/app/billing/usage").body()

    /** Overload without unitId — AppViewModel calls `getInvoices()`. */
    suspend fun getInvoices(): ApiResponse<List<Invoice>> =
        client.get("api/app/billing/invoices").body()

    /** Alias for [confirmBillingPayment] — AppViewModel calls `confirmPayment(sessionId)`. */
    suspend fun confirmPayment(sessionId: String): ApiResponse<PaymentResult> =
        confirmBillingPayment(sessionId)

    /** Overload matching AppViewModel call `upgradePlan(planId, paymentMethod)`. */
    suspend fun upgradePlan(planId: String, paymentMethod: String = "credit_card"): ApiResponse<PaymentResult> =
        initBillingPaymentSession(0, PaymentRequest(planId = planId, paymentMethod = paymentMethod)).mapData {
            PaymentResult(transactionId = it.sessionId, status = "pending", planId = planId.lowercase(), amount = it.amount, message = it.redirectUrl ?: "")
        }

    /** Overload for [getHelpArticles] with no arguments — AppViewModel calls `getHelpArticles()`. */
    suspend fun getHelpArticles(): ApiResponse<List<HelpArticle>> = getContextualHelp("")

    /** Overload accepting [SubmitSupportTicketRequest] directly — AppViewModel calls `submitSupportTicket(req)`. */
    suspend fun submitSupportTicket(req: SubmitSupportTicketRequest): ApiResponse<Unit> =
        kirimTiketBantuan(req.title, req.description, req.priority, req.unitId, req.screenContext)

    /** Tiket ke tim Bizgrow (email dukungan lewat server). */
    private suspend fun kirimTiketBantuan(judul: String, isi: String, prioritas: String, unitId: Int, layar: String? = null): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.post("api/app/help") {
            setBody(buildJsonObject {
                put("action", "ticket"); put("title", judul); put("description", isi); put("priority", prioritas); put("unitId", unitId)
                layar?.let { put("screenContext", it) }
            })
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }


    // ─── Fitur yang dulu salah alamat — disesuaikan dengan server (api/app/*) ──

    suspend fun getPosReport(unitId: Int): ApiResponse<PosReport> =
        client.get("api/app/pos/reports") { parameter("unitId", unitId) }.body()

    suspend fun createPosCash(unitId: Int, shiftId: Int, type: String, amount: Double, description: String): ApiResponse<Unit> =
        tanpaData(client.post("api/app/pos/cash") {
            setBody(buildJsonObject {
                put("unitId", unitId); put("shiftId", shiftId); put("type", type); put("amount", amount); put("description", description)
            })
        }.body())

    suspend fun getRekapPajak(unitId: Int, tahun: Int): ApiResponse<RekapPajak> =
        client.get("api/app/finance/pajak") { parameter("unitId", unitId); parameter("tahun", tahun) }.body()

    suspend fun getPosQueue(unitId: Int): ApiResponse<PosQueueData> =
        client.get("api/app/pos") {
            parameter("unitId", unitId)
            parameter("action", "queue")
        }.body()

    suspend fun updatePosQueueStatus(orderId: Int, status: String): ApiResponse<Unit> =
        tanpaData(client.post("api/app/pos") {
            setBody(buildJsonObject {
                put("action", "update-queue-status")
                put("orderId", orderId)
                put("status", status)
            })
        }.body())

    // POS shift → api/app/pos (action=shifts | open-shift | close-shift)
    suspend fun getPosShifts(unitId: Int): ApiResponse<List<PosShift>> =
        client.get("api/app/pos") {
            parameter("unitId", unitId)
            parameter("action", "shifts")
        }.body()

    suspend fun openShift(req: OpenShiftRequest): ApiResponse<PosShift> {
        val res: ApiResponse<IdDto> = client.post("api/app/pos") {
            setBody(buildJsonObject {
                put("action", "open-shift")
                putJsonObject("shift") {
                    put("unitId", req.unitId)
                    put("modalAwal", req.modalAwal)
                }
            })
        }.body()
        return res.mapData { PosShift(id = it.id, unitId = req.unitId, userId = 0, waktuBuka = "", modalAwal = req.modalAwal) }
    }

    suspend fun closeShift(req: CloseShiftRequest): ApiResponse<PosShift> {
        val res: ApiResponse<JsonElement> = client.post("api/app/pos") {
            setBody(buildJsonObject {
                put("action", "close-shift")
                putJsonObject("shift") {
                    put("shiftId", req.shiftId)
                    put("unitId", req.unitId)
                    put("kasAkhirAktual", req.kasAkhirAktual)
                    put("catatan", req.catatan)
                }
            })
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    // Lead marketing → api/app/marketing (PUT action=transfer-lead-to-crm)
    // Server belum menyimpan status lead selain "ditransfer ke CRM".
    suspend fun updateLeadStatus(leadId: Int, status: String, unitId: Int): ApiResponse<Unit> {
        if (!status.equals("converted", ignoreCase = true)) {
            return ApiResponse(false, "Status lead \"$status\" belum didukung server — hanya \"converted\" (transfer ke CRM)")
        }
        return client.put("api/app/marketing") {
            setBody(buildJsonObject {
                put("action", "transfer-lead-to-crm")
                put("leadId", leadId)
                put("unitId", unitId)
            })
        }.body()
    }

    suspend fun ajukanCuti(unitId: Int, employeeId: Int, tipe: String, mulai: String, selesai: String, alasan: String): ApiResponse<JsonObject> =
        client.post("api/app/hr/leave") {
            setBody(buildJsonObject {
                put("unitId", unitId); put("employeeId", employeeId); put("type", tipe)
                put("startDate", mulai); put("endDate", selesai); put("reason", alasan)
            })
        }.body()

    suspend fun putusCuti(leaveId: Int, status: String): ApiResponse<JsonObject> =
        client.put("api/app/hr/leave") { setBody(buildJsonObject { put("leaveId", leaveId); put("status", status) }) }.body()

    suspend fun getLeaveRequests(unitId: Int): ApiResponse<List<LeaveRequest>> =
        client.get("api/app/hr/leave") { parameter("unitId", unitId) }.body()

    // Kampanye → api/app/crm/campaigns
    suspend fun getMarketingCampaigns(unitId: Int): ApiResponse<List<MarketingCampaign>> =
        client.get("api/app/crm/campaigns") { parameter("unitId", unitId) }.body()

    suspend fun createMarketingCampaign(campaign: MarketingCampaign): ApiResponse<Unit> =
        client.post("api/app/crm/campaigns") { setBody(campaign) }.body()

    // Katalog → api/app/katalog
    suspend fun getKatalog(unitId: Int): ApiResponse<KatalogData> =
        client.get("api/app/katalog") { parameter("unitId", unitId) }.body()

    suspend fun toggleKatalogPublish(productId: String, isPublished: Boolean, unitId: Int): ApiResponse<Unit> =
        client.put("api/app/katalog") {
            setBody(buildJsonObject {
                put("action", "toggle-publish")
                put("productId", productId)
                put("unitId", unitId)
                put("publish", isPublished)
            })
        }.body()

    suspend fun updateKatalogSettings(settings: KatalogSettings): ApiResponse<Unit> =
        client.put("api/app/katalog") {
            setBody(buildJsonObject {
                put("action", "update-katalog-settings")
                put("unitId", settings.unitId)
                put("settings", Json.encodeToJsonElement(KatalogSettings.serializer(), settings))
            })
        }.body()

    suspend fun createUnit(req: CreateUnitRequest): ApiResponse<JsonObject> =
        client.post("api/app/business") { setBody(req) }.body()

    // Departemen → api/app/hr/departments (hapus pakai query departmentId & unitId)
    suspend fun getDepartments(unitId: Int): ApiResponse<List<Department>> =
        client.get("api/app/hr/departments") { parameter("unitId", unitId) }.body()

    suspend fun deleteDepartment(departmentId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/hr/departments") {
            parameter("departmentId", departmentId)
            parameter("unitId", unitId)
        }.body()

    suspend fun createDepartment(dept: Department): ApiResponse<Unit> =
        client.post("api/app/hr/departments") {
            setBody(buildJsonObject {
                put("unitId", dept.unitId)
                put("name", dept.name)
            })
        }.body()

    suspend fun komponenGaji(employeeId: Int, body: JsonObject): ApiResponse<JsonObject> =
        client.post("api/app/hr/$employeeId") { setBody(body) }.body()

    suspend fun getHrDetail(employeeId: Int): ApiResponse<HrDetailData> =
        client.get("api/app/hr/$employeeId").body()

    suspend fun updateHrKaryawan(employeeId: Int, data: JsonObject): ApiResponse<Unit> =
        tanpaData(client.put("api/app/hr/$employeeId") { setBody(data) }.body())

    suspend fun updateDepartmentName(departmentId: Int, unitId: Int, name: String): ApiResponse<Unit> =
        tanpaData(client.put("api/app/hr/departments") {
            setBody(buildJsonObject { put("departmentId", departmentId); put("unitId", unitId); put("name", name) })
        }.body())

    suspend fun markPayrollPaid(unitId: Int, ids: List<Int>): ApiResponse<Unit> =
        tanpaData(client.put("api/app/hr/payroll") {
            setBody(buildJsonObject {
                put("action", "mark-paid")
                put("unitId", unitId)
                put("payrollIds", kotlinx.serialization.json.JsonArray(ids.map { kotlinx.serialization.json.JsonPrimitive(it) }))
            })
        }.body())

    suspend fun getCrmTasks(unitId: Int): ApiResponse<List<CrmTask>> =
        client.get("api/app/crm/tasks") { parameter("unitId", unitId) }.body()

    // Bantuan → api/app/help (POST = feedback)
    suspend fun sendHelpFeedback(articleId: String, helpful: Boolean): ApiResponse<Unit> {
        val id = articleId.toIntOrNull() ?: return ApiResponse(false, "Artikel bantuan tidak valid")
        val res: ApiResponse<JsonElement> = client.post("api/app/help") {
            setBody(buildJsonObject {
                put("id", id)
                put("feedback", if (helpful) "membantu" else "tidak membantu")
                put("rating", if (helpful) 5 else 1)
            })
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    // Aset tetap → api/app/finance/fixed-assets
    suspend fun getFixedAssets(unitId: Int): ApiResponse<List<FixedAsset>> =
        client.get("api/app/finance/fixed-assets") { parameter("unitId", unitId) }.body()

    suspend fun getMarketingData(unitId: Int): ApiResponse<MarketingData> =
        client.get("api/app/marketing") { parameter("unitId", unitId) }.body()

    // Lead baru → api/app/marketing (POST action=create-lead). Server mewajibkan landing page milik unit.
    suspend fun createMarketingLead(lead: MarketingLead, landingPageId: Int? = null): ApiResponse<Unit> {
        val namaDepan = lead.nama.substringBefore(' ').ifBlank { lead.nama }
        val namaBelakang = lead.nama.substringAfter(' ', "")
        return client.post("api/app/marketing") {
            setBody(buildJsonObject {
                put("action", "create-lead")
                putJsonObject("lead") {
                    landingPageId?.let { put("landingPageId", it) }
                    put("unitId", lead.unitId)
                    put("firstName", namaDepan)
                    if (namaBelakang.isNotBlank()) put("lastName", namaBelakang)
                    if (lead.email.isNotBlank()) put("email", lead.email)
                    if (lead.telepon.isNotBlank()) put("phone", lead.telepon)
                    lead.notes?.let { put("notes", it) }
                }
            })
        }.body()
    }

    suspend fun getPosReturns(unitId: Int): ApiResponse<List<PosReturn>> =
        client.get("api/app/pos/returns") { parameter("unitId", unitId) }.body()

    suspend fun createReturn(req: CreateReturnRequest): ApiResponse<Unit> =
        client.post("api/app/pos/returns") { setBody(req) }.body()

    suspend fun getPosVouchers(unitId: Int): ApiResponse<List<PosVoucher>> =
        client.get("api/app/pos/vouchers") { parameter("unitId", unitId) }.body()

    /** Cek kode voucher untuk total belanja tertentu. Mengembalikan (pesan, potongan Rp) — potongan 0 bila tidak valid. */
    suspend fun validatePosVoucher(unitId: Int, kode: String, totalBelanja: Double): Pair<String, Double?> {
        val res: JsonObject = client.put("api/app/pos/vouchers") {
            setBody(buildJsonObject {
                put("action", "validate-voucher")
                put("unitId", unitId)
                put("code", kode)
                put("purchaseAmount", totalBelanja)
            })
        }.body()
        val ok = res["success"]?.jsonPrimitive?.booleanOrNull == true
        val pesan = res["message"]?.jsonPrimitive?.contentOrNull ?: if (ok) "Voucher valid" else "Voucher tidak valid"
        val potongan = res["voucher"]?.jsonObject?.get("discountAmount")?.jsonPrimitive?.doubleOrNull
        return pesan to (if (ok) potongan else null)
    }

    suspend fun createPosVoucher(v: PosVoucher): ApiResponse<Unit> =
        tanpaData(client.post("api/app/pos/vouchers") {
            setBody(buildJsonObject {
                put("unitId", v.unitId)
                put("code", v.code)
                put("discountType", v.discountType)
                put("discountValue", v.discountValue)
                put("maxUsage", v.maxUsage)
                put("minPurchase", v.minPurchase)
                put("validFrom", v.validFrom)
                put("validUntil", v.validUntil)
            })
        }.body())

    suspend fun updatePosVoucher(v: PosVoucher): ApiResponse<Unit> =
        tanpaData(client.put("api/app/pos/vouchers") {
            setBody(buildJsonObject {
                put("action", "update-voucher")
                put("voucherId", v.id)
                put("discountType", v.discountType)
                put("discountValue", v.discountValue)
                put("maxUsage", v.maxUsage)
                put("minPurchase", v.minPurchase)
                put("validFrom", v.validFrom)
                put("validUntil", v.validUntil)
                put("isActive", v.isActive)
            })
        }.body())

    suspend fun deletePosVoucher(id: Int): ApiResponse<Unit> =
        tanpaData(client.delete("api/app/pos/vouchers") { parameter("voucherId", id) }.body())

    // Business plan → api/app/business-plan (simpan = POST upsert by id, hapus = ?id=, terapkan = /apply)
    suspend fun getBusinessPlans(unitId: Int): ApiResponse<List<BusinessPlan>> {
        val res: ApiResponse<List<BusinessPlanDto>> = client.get("api/app/business-plan").body()
        return res.mapData { list -> list.map { it.keModel(unitId) } }
    }

    suspend fun createBusinessPlan(plan: BusinessPlan): ApiResponse<Unit> =
        simpanBusinessPlan(plan, withId = false)

    suspend fun updateBusinessPlan(plan: BusinessPlan): ApiResponse<Unit> =
        simpanBusinessPlan(plan, withId = true)

    private suspend fun simpanBusinessPlan(plan: BusinessPlan, withId: Boolean): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.post("api/app/business-plan") {
            setBody(buildJsonObject {
                if (withId && plan.id > 0) put("id", plan.id)
                put("namaBisnis", plan.title)
                put("kategori", plan.kategori)
                put("deskripsi", plan.description)
                put("aiSummary", plan.executiveSummary)
                put("targetPasar", plan.marketAnalysis)
                if (plan.status in setOf("DRAFT", "COMPLETE", "APPLIED")) put("status", plan.status)
            })
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    /** Plan lengkap untuk wizard (semua kolom). */
    suspend fun getPlanLengkap(id: Int): JsonObject? {
        val res: ApiResponse<JsonObject> = client.get("api/app/business-plan") { parameter("id", id) }.body()
        return if (res.success) res.data else null
    }

    /** Simpan semua field wizard (buat baru bila id kosong). Mengembalikan id plan. */
    suspend fun simpanPlanLengkap(body: JsonObject): Pair<Int?, String?> {
        val res: ApiResponse<JsonObject> = client.post("api/app/business-plan") { setBody(body) }.body()
        return if (res.success) (res.data?.get("id")?.jsonPrimitive?.intOrNull) to null else null to (res.message ?: "Gagal menyimpan plan")
    }

    /** Bantuan AI untuk wizard: mode hint | validate | canvas. */
    suspend fun aiPlanAssist(step: Int, field: String, kategori: String, konteks: JsonObject, mode: String): String? {
        val res: ApiResponse<JsonObject> = client.post("api/app/business-plan/ai-assist") {
            setBody(buildJsonObject { put("step", step); put("field", field); put("kategori", kategori); put("context", konteks); put("mode", mode) })
        }.body()
        return if (res.success) res.data?.get("result")?.jsonPrimitive?.contentOrNull else null
    }

    suspend fun deleteBusinessPlan(id: Int, unitId: Int): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.delete("api/app/business-plan") { parameter("id", id) }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    /** Terapkan plan: unitId null = buat unit baru dari plan. Balasan: unitId + totalRecords. */
    suspend fun terapkanPlan(planId: Int, unitId: Int?): ApiResponse<JsonObject> =
        client.post("api/app/business-plan/apply") {
            setBody(buildJsonObject { put("planId", planId); if (unitId != null && unitId > 0) put("unitId", unitId) })
        }.body()

    suspend fun applyBusinessPlan(id: Int, unitId: Int): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.post("api/app/business-plan/apply") {
            setBody(buildJsonObject {
                put("planId", id)
                if (unitId > 0) put("unitId", unitId)
            })
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    // Sosmed → api/app/sosmed (ubah = PUT dengan id di body, hapus = ?postId=)
    suspend fun getSosmedPosts(unitId: Int): ApiResponse<List<SocialPost>> =
        client.get("api/app/sosmed") { parameter("unitId", unitId) }.body()

    suspend fun createSosmedPost(post: SocialPost): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.post("api/app/sosmed") { setBody(post.keJson(withId = false)) }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    suspend fun updateSocialPost(post: SocialPost): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.put("api/app/sosmed") { setBody(post.keJson(withId = true)) }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    suspend fun deleteSocialPost(postId: Int, unitId: Int): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.delete("api/app/sosmed") {
            parameter("postId", postId)
            parameter("unitId", unitId)
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    // Caption AI → api/app/sosmed/generate-caption (balasan: { caption })
    suspend fun generateAiCaption(platform: String, productName: String): ApiResponse<Map<String, String>> =
        client.post("api/app/sosmed/generate-caption") {
            setBody(buildJsonObject {
                put("platform", platform)
                put("productName", productName)
            })
        }.body()

    suspend fun getWebsiteSettings(unitId: Int): ApiResponse<WebsiteSetting> =
        client.get("api/app/website") { parameter("unitId", unitId) }.body()

    suspend fun saveWebsiteSettings(settings: WebsiteSetting): ApiResponse<Unit> =
        client.put("api/app/website") { setBody(settings) }.body()

    // Bantuan → api/app/help?q=&category=
    suspend fun getContextualHelp(screenName: String): ApiResponse<List<HelpArticle>> = cariBantuan(null)

    suspend fun searchHelp(query: String): ApiResponse<List<HelpArticle>> = cariBantuan(query)

    private suspend fun cariBantuan(query: String?): ApiResponse<List<HelpArticle>> {
        val res: ApiResponse<HelpListDto> = client.get("api/app/help") {
            if (!query.isNullOrBlank()) parameter("q", query)
        }.body()
        return res.mapData { dto ->
            dto.items.map { HelpArticle(id = it.id.toString(), title = it.q, content = it.a, category = it.category) }
        }
    }

    // Landing page → api/app/landing-page (singular)
    suspend fun getLandingPages(unitId: Int): ApiResponse<List<LandingPage>> {
        val res: ApiResponse<List<LandingPageDto>> = client.get("api/app/landing-page") { parameter("unitId", unitId) }.body()
        return res.mapData { list -> list.map { it.keModel() } }
    }

    suspend fun getLandingPageTemplates(): ApiResponse<List<LandingPageTemplate>> {
        val res: ApiResponse<List<LandingTemplateDto>> = client.get("api/app/landing-page") { parameter("mode", "templates") }.body()
        return res.mapData { list -> list.map { LandingPageTemplate(key = it.id, name = it.name, description = it.description, sections = it.fields) } }
    }

    suspend fun createLandingPage(page: LandingPage): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.post("api/app/landing-page") { setBody(page.keJson(withId = false)) }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    suspend fun updateLandingPage(page: LandingPage): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.put("api/app/landing-page") { setBody(page.keJson(withId = true)) }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    suspend fun deleteLandingPage(pageId: Int, unitId: Int): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.delete("api/app/landing-page") {
            parameter("id", pageId)
            parameter("unitId", unitId)
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    suspend fun toggleLandingPage(pageId: Int, unitId: Int, isActive: Boolean): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.put("api/app/landing-page") {
            setBody(buildJsonObject {
                put("id", pageId)
                put("unitId", unitId)
                put("isActive", isActive)
            })
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    // Profil & akun → api/app/settings (mode=profile | password | preferences)
    suspend fun getProfileSettings(): ApiResponse<Map<String, String>> {
        val res: ApiResponse<ProfilDto> = client.get("api/app/settings") { parameter("mode", "profile") }.body()
        return res.mapData { mapOf("username" to it.username, "email" to it.email, "name" to it.name, "phone" to it.phone) }
    }

    suspend fun updateProfile(unitId: Int, data: Map<String, String>): ApiResponse<Unit> =
        ubahSettings("profile", data.filterValues { it.isNotBlank() }.mapValues { JsonPrimitive(it.value) })

    suspend fun changePassword(data: Map<String, String>): ApiResponse<Unit> =
        ubahSettings("password", data.mapValues { JsonPrimitive(it.value) })

    suspend fun updatePreferences(darkMode: Boolean, notifEnabled: Boolean): ApiResponse<Unit> =
        ubahSettings("preferences", mapOf("darkMode" to JsonPrimitive(darkMode), "notifPref" to JsonPrimitive(notifEnabled)))

    private suspend fun ubahSettings(mode: String, isi: Map<String, JsonElement>): ApiResponse<Unit> {
        val res: ApiResponse<JsonElement> = client.put("api/app/settings") {
            setBody(JsonObject(isi + ("mode" to JsonPrimitive(mode))))
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    // Target sales → api/app/sales/targets
    suspend fun getSalesTargets(unitId: Int, periode: String? = null): ApiResponse<SalesTargetData> {
        val res: ApiResponse<SalesTargetsDto> = client.get("api/app/sales/targets") { parameter("unitId", unitId) }.body()
        return res.mapData { dto ->
            val targets = dto.targets.map { t ->
                SalesTarget(
                    id = t.id, unitId = unitId, employeeId = t.userId, employeeName = t.userName,
                    periode = if (t.periodYear != null && t.periodMonth != null) "${t.periodYear}-${t.periodMonth.toString().padStart(2, '0')}" else "",
                    targetAmount = t.targetAmount
                )
            }.filter { periode.isNullOrBlank() || it.periode == periode }
            val commissions = dto.commissions.map { c ->
                SalesCommission(id = c.id, targetId = 0, employeeId = c.userId ?: 0, commissionAmount = c.amount, status = c.status.lowercase())
            }
            SalesTargetData(targets = targets, commissions = commissions, summary = SalesTargetSummary(totalTarget = targets.sumOf { it.targetAmount }))
        }
    }

    suspend fun createSalesTarget(target: SalesTarget): ApiResponse<Unit> {
        val tahun = target.periode.substringBefore('-').toIntOrNull()
        val bulan = target.periode.substringAfter('-', "").toIntOrNull()
        if (tahun == null || bulan == null) return ApiResponse(false, "Periode harus berformat YYYY-MM")
        val res: ApiResponse<JsonElement> = client.post("api/app/sales/targets") {
            setBody(buildJsonObject {
                put("action", "create-target")
                putJsonObject("target") {
                    put("unitId", target.unitId)
                    target.employeeId?.let { put("targetUserId", it) }
                    put("targetAmount", target.targetAmount)
                    put("periodMonth", bulan)
                    put("periodYear", tahun)
                }
            })
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    suspend fun ubahTargetSales(targetId: Int, unitId: Int, targetAmount: Double): ApiResponse<JsonObject> =
        client.put("api/app/sales/targets") {
            setBody(buildJsonObject { put("action", "update-target"); put("targetId", targetId); put("unitId", unitId); put("targetAmount", targetAmount) })
        }.body()

    suspend fun ubahStatusKampanye(campaignId: Int, unitId: Int, status: String): ApiResponse<JsonObject> =
        client.put("api/app/marketing") {
            setBody(buildJsonObject { put("action", "update-campaign-status"); put("campaignId", campaignId); put("unitId", unitId); put("status", status) })
        }.body()

    suspend fun hapusKampanye(campaignId: Int, unitId: Int): ApiResponse<JsonObject> =
        client.delete("api/app/marketing") { parameter("type", "campaign"); parameter("id", campaignId); parameter("unitId", unitId) }.body()

    suspend fun deleteSalesTarget(targetId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/sales/targets") {
            parameter("type", "target")
            parameter("id", targetId)
            parameter("unitId", unitId)
        }.body()

    suspend fun getTaxRates(unitId: Int): ApiResponse<List<TaxRate>> =
        client.get("api/app/finance/tax-rates") { parameter("unitId", unitId) }.body()

    // ─── Master data: tambah / ubah / hapus (sama dengan halaman master-data di web) ──

    suspend fun createFixedAsset(asset: FixedAsset): ApiResponse<Unit> =
        tanpaData(client.post("api/app/finance/fixed-assets") { setBody(asset.keJson(withId = false)) }.body())

    suspend fun updateFixedAsset(asset: FixedAsset): ApiResponse<Unit> =
        tanpaData(client.put("api/app/finance/fixed-assets") { setBody(asset.keJson(withId = true)) }.body())

    suspend fun deleteFixedAsset(id: Int, unitId: Int): ApiResponse<Unit> =
        tanpaData(client.delete("api/app/finance/fixed-assets") {
            parameter("id", id)
            parameter("unitId", unitId)
        }.body())

    suspend fun createTaxRate(tax: TaxRate): ApiResponse<Unit> =
        tanpaData(client.post("api/app/finance/tax-rates") { setBody(tax.keJson(withId = false)) }.body())

    suspend fun updateTaxRate(tax: TaxRate): ApiResponse<Unit> =
        tanpaData(client.put("api/app/finance/tax-rates") { setBody(tax.keJson(withId = true)) }.body())

    suspend fun deleteTaxRate(id: Int, unitId: Int): ApiResponse<Unit> =
        tanpaData(client.delete("api/app/finance/tax-rates") {
            parameter("id", id)
            parameter("unitId", unitId)
        }.body())

    suspend fun createBudgetItem(item: BudgetItem): ApiResponse<Unit> =
        tanpaData(client.post("api/app/finance/budget") {
            setBody(buildJsonObject {
                put("unitId", item.unitId)
                put("coaId", item.coaId)
                put("tahun", item.tahun)
                put("bulan", item.bulan)
                put("nominal", item.nominal)
                item.keterangan?.let { put("keterangan", it) }
            })
        }.body())

    suspend fun updateBudgetItem(id: Int, unitId: Int, nominal: Double, keterangan: String?): ApiResponse<Unit> =
        tanpaData(client.put("api/app/finance/budget") {
            setBody(buildJsonObject {
                put("id", id)
                put("unitId", unitId)
                put("nominal", nominal)
                put("keterangan", keterangan)
            })
        }.body())

    suspend fun deleteBudgetItem(id: Int, unitId: Int): ApiResponse<Unit> =
        tanpaData(client.delete("api/app/finance/budget") {
            parameter("id", id)
            parameter("unitId", unitId)
        }.body())

    /** Isi COA standar sesuai jenis usaha (GROSIR, MINIMARKET, RESTORAN, CAFE, ..., LAINNYA). Gagal kalau unit sudah punya COA. */
    suspend fun seedDefaultCoa(unitId: Int, type: String = "LAINNYA"): ApiResponse<Unit> =
        tanpaData(client.post("api/app/finance/coa") {
            setBody(buildJsonObject {
                put("action", "seed-default")
                put("unitId", unitId)
                put("type", type)
            })
        }.body())

    /** Ubah harga beli / jual (dan stok minimum) satu produk. */
    suspend fun ubahHarga(productId: String, hargaBeli: Double, hargaJual: Double, minStok: Int): ApiResponse<JsonObject> =
        client.put("api/app/products/pricing") {
            setBody(buildJsonObject { put("id", productId); put("hargaBeli", hargaBeli); put("hargaJual", hargaJual); put("minStok", minStok) })
        }.body()

    /** Simpan stok opname: item = (productId, stok fisik). Stok sistem diambil server saat itu juga. */
    suspend fun simpanStokOpname(unitId: Int, catatan: String?, items: List<Pair<String, Int>>): ApiResponse<JsonObject> =
        client.post("api/app/products/stock-opname") {
            setBody(buildJsonObject {
                put("unitId", unitId)
                if (!catatan.isNullOrBlank()) put("notes", catatan)
                putJsonArray("items") { items.forEach { (id, fisik) -> add(buildJsonObject { put("productId", id); put("actualStock", fisik) }) } }
            })
        }.body()

    suspend fun getStockOpnameList(unitId: Int): ApiResponse<List<StockOpnameSession>> =
        client.get("api/app/products/stock-opname") { parameter("unitId", unitId) }.body()

    suspend fun getTrashProducts(unitId: Int): ApiResponse<List<Product>> =
        client.get("api/app/products/trash") { parameter("unitId", unitId) }.body()

    // Pulihkan produk → POST api/app/products/trash
    suspend fun restoreProduct(productId: String): ApiResponse<Unit> =
        client.post("api/app/products/trash") { setBody(buildJsonObject { put("productId", productId) }) }.body()

    // Penawaran & sales order → api/app/crm/*
    suspend fun getQuotations(unitId: Int): ApiResponse<List<Quotation>> =
        client.get("api/app/crm/quotations") { parameter("unitId", unitId) }.body()

    suspend fun getSalesOrders(unitId: Int): ApiResponse<List<SalesOrder>> =
        client.get("api/app/crm/sales-orders") { parameter("unitId", unitId) }.body()

    private fun kotlinx.serialization.json.JsonObjectBuilder.itemJual(items: List<ItemJual>) {
        putJsonArray("items") {
            items.forEach { add(buildJsonObject { if (it.productId != null) put("productId", it.productId); put("qty", it.qty); put("price", it.price) }) }
        }
    }

    suspend fun buatPenawaran(unitId: Int, customerId: Int?, validUntil: String?, notes: String?, items: List<ItemJual>): ApiResponse<JsonObject> =
        client.post("api/app/crm/quotations") {
            setBody(buildJsonObject {
                put("unitId", unitId)
                if (customerId != null) put("customerId", customerId)
                if (!validUntil.isNullOrBlank()) put("validUntil", validUntil)
                if (!notes.isNullOrBlank()) put("notes", notes)
                itemJual(items)
            })
        }.body()

    suspend fun ubahStatusPenawaran(unitId: Int, quotationId: Int, status: String): ApiResponse<JsonObject> =
        client.put("api/app/crm/quotations") {
            setBody(buildJsonObject { put("action", "update-status"); put("unitId", unitId); put("quotationId", quotationId); put("status", status) })
        }.body()

    suspend fun jadikanSalesOrder(unitId: Int, quotationId: Int): ApiResponse<JsonObject> =
        client.put("api/app/crm/quotations") {
            setBody(buildJsonObject { put("action", "convert-to-order"); put("unitId", unitId); put("quotationId", quotationId) })
        }.body()

    suspend fun buatSalesOrder(unitId: Int, customerId: Int?, notes: String?, items: List<ItemJual>): ApiResponse<JsonObject> =
        client.post("api/app/crm/sales-orders") {
            setBody(buildJsonObject {
                put("unitId", unitId)
                if (customerId != null) put("customerId", customerId)
                if (!notes.isNullOrBlank()) put("notes", notes)
                itemJual(items)
            })
        }.body()

    suspend fun ubahStatusSalesOrder(orderId: Int, status: String): ApiResponse<JsonObject> =
        client.put("api/app/crm/sales-orders") {
            setBody(buildJsonObject { put("orderId", orderId); put("status", status) })
        }.body()

    // Tutup buku → api/app/finance/close-period
    suspend fun getClosingPeriods(unitId: Int): ApiResponse<List<ClosingPeriod>> =
        client.get("api/app/finance/close-period") { parameter("unitId", unitId) }.body()

    suspend fun createClosingPeriod(unitId: Int, mulai: String, akhir: String, keterangan: String?): ApiResponse<Unit> =
        tanpaData(client.post("api/app/finance/close-period") {
            setBody(buildJsonObject {
                put("unitId", unitId)
                put("periodStart", mulai)
                put("periodEnd", akhir)
                keterangan?.takeIf { it.isNotBlank() }?.let { put("keterangan", it) }
            })
        }.body())

    suspend fun bukaKembaliPeriode(unitId: Int, id: Int): ApiResponse<Unit> =
        tanpaData(client.delete("api/app/finance/close-period") {
            parameter("id", id)
            parameter("unitId", unitId)
        }.body())

    // COA → api/app/finance/coa (tambah / ubah nama-deskripsi-status / nonaktifkan)
    suspend fun createCoa(unitId: Int, kode: String, nama: String, tipe: String, normalBalance: String, deskripsi: String?): ApiResponse<Unit> =
        tanpaData(client.post("api/app/finance/coa") {
            setBody(buildJsonObject {
                put("unitId", unitId)
                put("kodeAkun", kode)
                put("namaAkun", nama)
                put("tipeAkun", tipe)
                put("normalBalance", normalBalance)
                deskripsi?.takeIf { it.isNotBlank() }?.let { put("deskripsi", it) }
            })
        }.body())

    /** COA otomatis dari deskripsi bisnis (AI). [tambahkan] = lengkapi COA yang sudah ada. */
    suspend fun generateCoaAi(unitId: Int, deskripsi: String, tambahkan: Boolean): ApiResponse<Unit> =
        tanpaData(client.post("api/app/finance/coa") {
            setBody(buildJsonObject { put("action", "generate-ai"); put("unitId", unitId); put("deskripsi", deskripsi); put("tambahkan", tambahkan) })
        }.body())

    suspend fun updateCoa(id: Int, nama: String, deskripsi: String?, aktif: Boolean): ApiResponse<Unit> =
        tanpaData(client.put("api/app/finance/coa") {
            setBody(buildJsonObject {
                put("id", id)
                put("namaAkun", nama)
                put("deskripsi", deskripsi ?: "")
                put("isActive", aktif)
            })
        }.body())

    suspend fun deleteCoa(id: Int): ApiResponse<Unit> =
        tanpaData(client.delete("api/app/finance/coa") { parameter("coaId", id) }.body())

    // Persetujuan → api/app/hr/approvals
    suspend fun getApprovals(unitId: Int): ApiResponse<ApprovalsData> =
        client.get("api/app/hr/approvals") { parameter("unitId", unitId) }.body()

    /** status: "approve" | "reject" (atau "approved"/"rejected") */
    suspend fun approveRequest(approvalId: Int, status: String, unitId: Int): ApiResponse<Unit> =
        client.put("api/app/hr/approvals") {
            setBody(buildJsonObject {
                put("action", if (status.startsWith("approve", ignoreCase = true)) "approve-request" else "reject-request")
                put("requestId", approvalId)
                put("unitId", unitId)
            })
        }.body()

    suspend fun createApprovalRequest(req: ApprovalRequest): ApiResponse<Unit> {
        val pinjaman = req.type.equals("loan", ignoreCase = true)
        val res: ApiResponse<JsonElement> = client.post("api/app/hr/approvals") {
            setBody(buildJsonObject {
                put("action", if (pinjaman) "create-loan-request" else "create-reimbursement-request")
                put("unitId", req.unitId)
                put("employeeId", req.employeeId)
                put("amount", req.amount)
                if (pinjaman) {
                    put("purpose", req.description)
                    put("repaymentMonths", 1)
                    put("monthlyDeduction", req.amount)
                } else {
                    put("category", "LAINNYA")
                    put("description", req.description)
                    put("expenseDate", Clock.System.todayIn(TimeZone.currentSystemDefault()).toString())
                    req.attachmentUrl?.let { put("receiptUrl", it) }
                }
            })
        }.body()
        return ApiResponse(res.success, res.message, null, res.code)
    }

    suspend fun getBudgetItems(unitId: Int, year: Int): ApiResponse<List<BudgetItem>> =
        client.get("api/app/finance/budget") {
            parameter("unitId", unitId)
            parameter("tahun", year)
        }.body()

    suspend fun getExportHistory(unitId: Int): ApiResponse<List<ExportHistoryItem>> =
        client.get("api/app/export/history") { parameter("unitId", unitId) }.body()

    // ─── Toko online & metode bayar (web: ecommerce/[slug] & ecommerce/[slug]/integrasi) ──
    suspend fun getStoreSettings(unitId: Int): ApiResponse<StoreSettings> =
        client.get("api/app/ecommerce/settings") { parameter("unitId", unitId) }.body()

    suspend fun updateStoreSettings(settings: StoreSettings): ApiResponse<StoreSettings> =
        client.put("api/app/ecommerce/settings") {
            setBody(buildJsonObject {
                put("unitId", settings.unitId)
                put("storefrontName", settings.storefrontName)
                put("description", settings.description)
                put("domainSlug", settings.domainSlug)
                put("isActive", settings.isActive)
            })
        }.body()

    /** Server key dikirim sekali saat disimpan dan tidak pernah dikembalikan server. */
    suspend fun saveStorePaymentConfig(unitId: Int, clientKey: String, serverKey: String, sandbox: Boolean): ApiResponse<StorePaymentConfig> =
        client.put("api/app/ecommerce/payment") {
            setBody(buildJsonObject {
                put("unitId", unitId)
                put("midtransClientKey", clientKey)
                put("midtransServerKey", serverKey)
                put("midtransSandbox", sandbox)
            })
        }.body()

    // ─── Knowledge base layanan pelanggan (web: ecommerce/[slug]/layanan/.../knowledge-base) ──
    suspend fun getKnowledgeBase(unitId: Int, query: String? = null): ApiResponse<List<KnowledgeArticle>> =
        client.get("api/app/knowledge-base") {
            parameter("unitId", unitId)
            query?.takeIf { it.isNotBlank() }?.let { parameter("q", it) }
        }.body()

    suspend fun createKnowledgeArticle(article: KnowledgeArticle): ApiResponse<Unit> =
        tanpaData(client.post("api/app/knowledge-base") {
            setBody(buildJsonObject {
                put("unitId", article.unitId)
                put("title", article.title)
                put("category", article.category)
                put("content", article.content)
            })
        }.body())

    suspend fun deleteKnowledgeArticle(id: Int, unitId: Int): ApiResponse<Unit> =
        tanpaData(client.delete("api/app/knowledge-base") {
            parameter("id", id)
            parameter("unitId", unitId)
        }.body())

    // ─── Pengaturan POS (web: pos/kelola/fitur & pos/kelola/produk) ──────────
    suspend fun getPosFeatures(unitId: Int): ApiResponse<PosFeatureSettings> =
        client.get("api/app/pos/features") { parameter("unitId", unitId) }.body()

    suspend fun updatePosFeatures(unitId: Int, features: Map<String, Boolean>): ApiResponse<PosFeatureSettings> =
        client.put("api/app/pos/features") {
            setBody(buildJsonObject {
                put("unitId", unitId)
                put("features", JsonObject(features.mapValues { JsonPrimitive(it.value) }))
            })
        }.body()

    suspend fun resetPosFeatures(unitId: Int): ApiResponse<PosFeatureSettings> =
        client.delete("api/app/pos/features") { parameter("unitId", unitId) }.body()

    suspend fun getPosProducts(unitId: Int): ApiResponse<List<PosProductItem>> =
        client.get("api/app/pos/products") { parameter("unitId", unitId) }.body()

    suspend fun setProductShowInPos(unitId: Int, productId: String, show: Boolean): ApiResponse<Unit> =
        tanpaData(client.put("api/app/pos/products") {
            setBody(buildJsonObject {
                put("unitId", unitId)
                put("productId", productId)
                put("showInPos", show)
            })
        }.body())

    // Kas masuk/keluar shift → api/app/pos/cash?shiftId=
    suspend fun getPosCashTransactions(shiftId: Int): ApiResponse<List<PosCashTransaction>> =
        client.get("api/app/pos/cash") { parameter("shiftId", shiftId) }.body()

    private fun <T> fiturDihentikan(nama: String): ApiResponse<T> =
        ApiResponse(false, "$nama tidak tersedia", null, "FEATURE_DISCONTINUED")
}

/** Hasil kirim ulang satu item antrean offline */
data class HasilKirimAntrean(val terkirim: Boolean, val ditolakPermanen: Boolean, val pesan: String?)

// ─── Helper & DTO internal: menyesuaikan bentuk data server dengan model app ──

private fun <A, B> ApiResponse<A>.mapData(f: (A) -> B): ApiResponse<B> =
    ApiResponse(success, message, data?.let(f), code)

/** Buang isi `data` (bentuknya bisa apa saja) untuk fungsi yang cukup tahu berhasil/gagal */
private fun tanpaData(res: ApiResponse<JsonElement>): ApiResponse<Unit> =
    ApiResponse(res.success, res.message, null, res.code)

private fun FixedAsset.keJson(withId: Boolean) = buildJsonObject {
    if (withId) put("id", id)
    put("unitId", unitId)
    put("namaAset", namaAset)
    put("kategori", kategori)
    put("nilaiPerolehan", nilaiPerolehan)
    put("tanggalPerolehan", tanggalPerolehan)
    put("umurEkonomis", umurEkonomis)
    put("metodePenyusutan", metodePenyusutan)
    put("nilaiSisa", nilaiSisa)
    if (withId) put("status", status)
    keterangan?.let { put("keterangan", it) }
    // PUT: kosong = lepas dari akun COA; POST: hanya dikirim bila dipilih
    if (withId) put("coaId", coaId) else coaId?.let { put("coaId", it) }
}

private fun TaxRate.keJson(withId: Boolean) = buildJsonObject {
    if (withId) put("id", id)
    put("unitId", unitId)
    put("namaPajak", namaPajak)
    put("persentase", persentase)
    put("tipe", tipe)
    put("isDefault", isDefault)
    if (withId) put("isActive", isActive)
}

@Serializable
private data class IdDto(val id: Int = 0)

@Serializable
private data class ProfilDto(val username: String = "", val email: String = "", val name: String = "", val phone: String = "")

@Serializable
private data class HelpItemDto(val id: Int = 0, val q: String = "", val a: String = "", val category: String = "")

@Serializable
private data class HelpListDto(val items: List<HelpItemDto> = emptyList())

@Serializable
private data class SalesTargetDto(
    val id: Int = 0,
    val userId: Int? = null,
    val userName: String = "",
    val targetAmount: Double = 0.0,
    val periodMonth: Int? = null,
    val periodYear: Int? = null,
    val komisiPersen: Double = 0.0
)

@Serializable
private data class SalesCommissionDto(val id: Int = 0, val userId: Int? = null, val amount: Double = 0.0, val status: String = "")

@Serializable
private data class SalesTargetsDto(
    val targets: List<SalesTargetDto> = emptyList(),
    val commissions: List<SalesCommissionDto> = emptyList()
)

@Serializable
private data class BusinessPlanDto(
    val id: Int = 0,
    val unitId: Int? = null,
    val namaBisnis: String = "",
    val kategori: String = "",
    val deskripsi: String? = null,
    val targetPasar: String? = null,
    val aiSummary: String? = null,
    val status: String = "DRAFT",
    val currentStep: Int? = 1,
    val isSeeded: Int? = 0,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    fun keModel(unitAktif: Int) = BusinessPlan(
        currentStep = (currentStep ?: 1).coerceIn(1, 7), isSeeded = (isSeeded ?: 0) != 0,
        id = id, unitId = unitId ?: unitAktif, title = namaBisnis, kategori = kategori,
        description = deskripsi.orEmpty(), executiveSummary = aiSummary.orEmpty(),
        marketAnalysis = targetPasar.orEmpty(), status = status,
        createdAt = createdAt.orEmpty(), updatedAt = updatedAt.orEmpty()
    )
}

@Serializable
private data class LandingPageDto(
    val id: Int = 0,
    val unitId: Int = 0,
    val pageSlug: String = "",
    val title: String = "",
    val templateId: String? = null,
    val isActive: Boolean = false,
    val createdAt: String = ""
) {
    fun keModel() = LandingPage(
        id = id, unitId = unitId, title = title, pageSlug = pageSlug,
        template = templateId ?: "leadgen", isActive = isActive, createdAt = createdAt
    )
}

@Serializable
private data class LandingTemplateDto(val id: String = "", val name: String = "", val description: String = "", val fields: List<String> = emptyList())

private fun SocialPost.keJson(withId: Boolean) = buildJsonObject {
    if (withId) put("id", id)
    put("unitId", unitId)
    put("platform", platform)
    put("caption", caption)
    if (imageUrl.isNotBlank()) put("imageUrl", imageUrl)
    scheduledAt?.takeIf { it.isNotBlank() }?.let { put("scheduledAt", it) }
    put("status", status)
}

private fun LandingPage.keJson(withId: Boolean) = buildJsonObject {
    if (withId) put("id", id)
    put("unitId", unitId)
    put("pageSlug", pageSlug)
    put("title", title)
    put("templateId", template)
    // contentJson disimpan sebagai JSON (bukan string) supaya bisa dibaca halaman web
    put("contentJson", runCatching { Json.parseToJsonElement(contentJson) }.getOrElse { JsonObject(emptyMap()) })
    put("isActive", isActive)
}
