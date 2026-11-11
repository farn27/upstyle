package com.upstyle.bizgrow.ui

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.russhwolf.settings.MapSettings
import com.upstyle.bizgrow.data.SessionRepository
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowLooper
import java.io.File

/**
 * Audit UI: merender layar ASLI aplikasi (App + AppViewModel) terhadap server lokal berisi data contoh,
 * lalu menyimpan tangkapan layar tiap layar ke build/layar/. Hanya jalan bila HP_SERVER & HP_TOKEN diisi,
 * jadi tidak memengaruhi build biasa.
 *
 * Cara pakai (server web lokal + akun uji):
 *   HP_SERVER=http://127.0.0.1:5173 HP_TOKEN=<token login> [HP_LAYAR=Pos,Products] [HP_TEMA=dark] \
 *   [ROBOLECTRIC_REPO=<mirror Maven Central>] ./gradlew :shared:testDebugUnitTest --tests '*LayarTest*'
 * AlurTest memakai variabel yang sama (HP_ALUR untuk memilih alur), hasilnya di build/alur/.
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w393dp-h852dp-xxhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class LayarTest(private val nama: String) {

    companion object {
        private val produk = System.getenv("HP_PRODUK")?.ifBlank { null } ?: "1"
        private val produkVarian = System.getenv("HP_PRODUK_VARIAN")?.ifBlank { null } ?: produk

        val semua: Map<String, Screen> by lazy {
            linkedMapOf<String, Screen>().apply {
                listOf(
                    Screen.Home, Screen.Dashboard, Screen.Modules, Screen.Units, Screen.Notifications, Screen.Finance,
                    Screen.TransactionEntry, Screen.Laporan, Screen.BukuBesar, Screen.JurnalUmum, Screen.Piutang, Screen.Hutang,
                    Screen.Neraca, Screen.Budget, Screen.TaxRates, Screen.ClosingPeriod, Screen.Coa, Screen.FixedAssets,
                    Screen.AccountingContacts, Screen.Pos, Screen.PosShift, Screen.PosReturn, Screen.PosVouchers, Screen.PosQueue,
                    Screen.PosReport, Screen.Products, Screen.KategoriProduk, Screen.TrashProducts, Screen.StockOpname,
                    Screen.StockLogs, Screen.BulkOperations, Screen.ExportImport, Screen.Katalog, Screen.Orders, Screen.Hr,
                    Screen.Departments, Screen.LeaveRequests, Screen.Absensi, Screen.Approvals, Screen.Payroll,
                    Screen.EmployeeDetail, Screen.Crm, Screen.CrmContacts, Screen.CrmPipeline, Screen.CrmActivities,
                    Screen.CrmTasks, Screen.Quotations, Screen.SalesOrders, Screen.SalesTargets, Screen.Cs, Screen.CsInbox,
                    Screen.KnowledgeBase, Screen.Scm, Screen.PoDetail, Screen.Marketing, Screen.MarketingCampaigns,
                    Screen.Pricing, Screen.Sosmed, Screen.WebsiteBuilder, Screen.LandingPageScreen, Screen.BusinessPlan,
                    Screen.PlanWizard, Screen.LaporanWa, Screen.AiChat, Screen.HelpCenter, Screen.Profile, Screen.Settings,
                    Screen.AdvancedSettings, Screen.SubscriptionPlans, Screen.PlanUpgrade, Screen.InvoiceHistory,
                    Screen.UsageMetrics, Screen.Diagnostics, Screen.SyncStatus, Screen.BarcodeScanner, Screen.Login,
                    Screen.Register
                ).forEach { put(it::class.simpleName!!, it) }
                put("ProdukDetail", Screen.ProdukDetail(produk))
                put("ProductVariants", Screen.ProductVariants(produkVarian))
                put("StockMovement", Screen.StockMovement(produk))
                put("PricingStrategy", Screen.PricingStrategy(produk))
                put("OrderDetail", Screen.OrderDetail(1))
                put("TicketDetail", Screen.TicketDetail(1))
                put("SupportTicketDetail", Screen.SupportTicketDetail(1))
            }
        }

        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun data(): List<Array<Any>> {
            val pilih = System.getenv("HP_LAYAR")?.split(',')?.map { it.trim() }?.filter { it.isNotEmpty() }?.takeIf { it.isNotEmpty() }
            return semua.keys.filter { pilih == null || it in pilih }.map { arrayOf<Any>(it) }
        }
    }

    @get:Rule val rule = createComposeRule()

    private fun tunggu(ms: Long) {
        var t = 0L
        while (t < ms) {
            Thread.sleep(100)
            rule.mainClock.advanceTimeBy(100)
            ShadowLooper.idleMainLooper()
            t += 100
        }
    }

    @Test
    fun render() {
        val server = System.getenv("HP_SERVER")?.ifBlank { null }
        val token = System.getenv("HP_TOKEN")?.ifBlank { null }
        assumeTrue("HP_SERVER/HP_TOKEN tidak diisi", server != null && token != null)
        val unit = (System.getenv("HP_UNIT")?.ifBlank { null } ?: "1").toInt()

        val session = SessionRepository(MapSettings())
        session.setServerUrl(server!!)
        session.saveSession(token!!, "enterprise", "demo.hp@contoh.id", "Sari Demo", 1)
        session.setActiveUnit(unit, "Kedai Kopi Sari", "kedai-kopi-sari")
        val vm = AppViewModel(session)
        val tema = System.getenv("HP_TEMA")?.ifBlank { null }
        tema?.let { vm.setThemeMode(it) }
        val layar = semua.getValue(nama)

        rule.mainClock.autoAdvance = false
        rule.setContent { App(vm) }
        tunggu(1500)
        when {
            layar == Screen.Home -> Unit
            // layar detail yang butuh pilihan dari daftar dibuka lewat jalur yang sama dengan aplikasi
            layar == Screen.EmployeeDetail -> vm.bukaKaryawan(1)
            else -> vm.navigate(layar)
        }
        tunggu(4000)

        val dir = File(if (tema == "dark") "build/layar-gelap" else "build/layar").apply { mkdirs() }
        rule.onRoot().captureRoboImage(File(dir, "$nama.png").path)
        // galat terakhir yang ditampilkan ke pengguna (snackbar/state) ikut dicatat
        File(dir, "$nama.txt").writeText("layar=${vm.screen.value::class.simpleName}\nui=${vm.uiState.value}\n")
    }
}
