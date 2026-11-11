package com.upstyle.bizgrow.ui

import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import com.github.takahirom.roborazzi.captureScreenRoboImage
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
 * Audit UI alur interaktif (tanpa menyimpan apa pun ke server): mengetuk produk di kasir, membuka sheet bayar,
 * memilih varian, membuka form produk, mengisi tutup shift. Tangkapan layar (termasuk bottom sheet) disimpan
 * ke build/alur/. Hanya jalan bila HP_SERVER & HP_TOKEN diisi.
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w393dp-h852dp-xxhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class AlurTest(private val nama: String) {

    companion object {
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun data(): List<Array<Any>> {
            val semua = listOf("pos-keranjang", "pos-bayar", "pos-varian", "produk-tambah", "shift-tutup", "entri-transaksi", "pengaturan-tema")
            val pilih = System.getenv("HP_ALUR")?.split(',')?.map { it.trim() }?.filter { it.isNotEmpty() }?.takeIf { it.isNotEmpty() }
            return semua.filter { pilih == null || it in pilih }.map { arrayOf<Any>(it) }
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

    private fun ketuk(teks: String) { rule.onAllNodesWithText(teks, substring = true).onFirst().performClick(); tunggu(1200) }

    private fun foto(sufiks: String = "") {
        val dir = File("build/alur").apply { mkdirs() }
        captureScreenRoboImage(File(dir, "$nama$sufiks.png").path)
    }

    @Test
    fun alur() {
        val server = System.getenv("HP_SERVER")?.ifBlank { null }
        val token = System.getenv("HP_TOKEN")?.ifBlank { null }
        assumeTrue("HP_SERVER/HP_TOKEN tidak diisi", server != null && token != null)

        val session = SessionRepository(MapSettings())
        session.setServerUrl(server!!)
        session.saveSession(token!!, "enterprise", "demo.hp@contoh.id", "Sari Demo", 1)
        session.setActiveUnit(1, "Kedai Kopi Sari", "kedai-kopi-sari")
        val vm = AppViewModel(session)
        rule.mainClock.autoAdvance = false
        rule.setContent { App(vm) }
        tunggu(1500)

        when (nama) {
            "pos-keranjang" -> {
                vm.navigate(Screen.Pos); tunggu(4000)
                ketuk("Roti Bakar Keju"); ketuk("Roti Bakar Keju"); ketuk("Mie Goreng Spesial")
                foto()
            }
            "pos-bayar" -> {
                vm.navigate(Screen.Pos); tunggu(4000)
                ketuk("Roti Bakar Keju"); ketuk("Mie Goreng Spesial")
                rule.onAllNodesWithText("Bayar").onFirst().performClick(); tunggu(2500)
                foto()
            }
            "pos-varian" -> {
                vm.navigate(Screen.Pos); tunggu(4000)
                ketuk("Kaos Kedai Sari"); tunggu(1000)
                foto()
            }
            "produk-tambah" -> {
                vm.navigate(Screen.Products); tunggu(4000)
                rule.onNodeWithContentDescription("Tambah Produk").performClick(); tunggu(2500)
                foto()
            }
            "shift-tutup" -> {
                vm.navigate(Screen.PosShift); tunggu(4000)
                ketuk("Tutup shift"); tunggu(800)
                rule.onAllNodes(hasSetTextAction()).onFirst().performTextInput("290000"); tunggu(1000)
                foto()
            }
            "entri-transaksi" -> {
                vm.navigate(Screen.TransactionEntry); tunggu(4500)
                foto()
            }
            "pengaturan-tema" -> {
                vm.navigate(Screen.Settings); tunggu(3000)
                foto()
                if (rule.onAllNodes(hasText("Gelap")).fetchSemanticsNodes().isNotEmpty()) { ketuk("Gelap"); tunggu(1500); foto("-gelap") }
            }
        }
    }
}
