package com.upstyle.bizgrow.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import com.github.takahirom.roborazzi.captureRoboImage
import com.russhwolf.settings.MapSettings
import com.upstyle.bizgrow.data.SessionRepository
import com.upstyle.bizgrow.ui.screens.AnalisisCerdasCard
import com.upstyle.bizgrow.ui.theme.BizgrowTheme
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowLooper
import java.io.File

/**
 * Render kartu Analisis Cerdas dengan data asli dari server lokal (GET /api/analitik).
 * Hanya jalan bila HP_SERVER & HP_TOKEN diisi; unit dari HP_UNIT. Hasil: build/layar/AnalisisCerdas.png.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w393dp-h1600dp-xxhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class AnalisisCerdasTest {
    @get:Rule val rule = createComposeRule()

    @Test
    fun render() {
        val server = System.getenv("HP_SERVER")?.ifBlank { null }
        val token = System.getenv("HP_TOKEN")?.ifBlank { null }
        assumeTrue("HP_SERVER/HP_TOKEN tidak diisi", server != null && token != null)
        val unit = (System.getenv("HP_UNIT")?.ifBlank { null } ?: "1").toInt()
        val session = SessionRepository(MapSettings())
        session.setServerUrl(server!!)
        session.saveSession(token!!, "enterprise", "demo.hp@contoh.id", "Sari Demo", 1)
        session.setActiveUnit(unit, "Unit", "unit")
        val vm = AppViewModel(session)
        vm.loadAnalitik()
        var t = 0
        while (vm.analitik.value == null && t < 15_000) { Thread.sleep(100); ShadowLooper.idleMainLooper(); t += 100 }
        rule.setContent {
            BizgrowTheme {
                Box(Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.background).padding(16.dp)) {
                    AnalisisCerdasCard(vm.analitik.value, sembunyi = false)
                }
            }
        }
        rule.waitForIdle()
        val dir = File("build/layar").apply { mkdirs() }
        rule.onRoot().captureRoboImage(File(dir, "AnalisisCerdas.png").path)
    }
}
