package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.SearchOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.ModuleCatalog
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizMotion

/** Hub "Semua Fitur": cari & jelajahi seluruh modul per kategori. */
@Composable
fun ModulesScreen(viewModel: AppViewModel) {
    val activeUnit by viewModel.activeUnit.collectAsState(initial = viewModel.activeUnit.value)
    var query by remember { mutableStateOf("") }
    var kategori by remember { mutableStateOf<String?>(null) }

    val hasil = remember(query, kategori) {
        val q = query.trim().lowercase()
        ModuleCatalog
            .filter { kategori == null || it.title == kategori }
            .map { grup ->
                grup to grup.modules.filter { m ->
                    q.isEmpty() || m.label.lowercase().contains(q) || m.keywords.contains(q)
                }
            }
            .filter { it.second.isNotEmpty() }
    }
    val total = hasil.sumOf { it.second.size }

    BizScreen(
        title = "Semua Fitur",
        subtitle = activeUnit?.name?.let { "Unit aktif: $it" } ?: "${ModuleCatalog.sumOf { it.modules.size }} modul siap dipakai",
        bottomBar = { BottomNavBar(viewModel, Screen.Modules) }
    ) { padding ->
        LazyVerticalGrid(
            columns = GridCells.Fixed(4),
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Column(Modifier.padding(horizontal = 4.dp)) {
                    BizSearchField(query, { query = it }, placeholder = "Cari fitur, mis. \"piutang\" atau \"gaji\"")
                    Spacer(Modifier.height(12.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item { FilterPill("Semua", kategori == null, { kategori = null }) }
                        items(ModuleCatalog) { g ->
                            FilterPill(g.title, kategori == g.title, { kategori = if (kategori == g.title) null else g.title })
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                }
            }

            if (total == 0) {
                item(span = { GridItemSpan(maxLineSpan) }) {
                    EmptyView(
                        title = "Fitur tidak ditemukan",
                        message = "Coba kata lain, misalnya \"stok\", \"kasir\", atau \"laporan\".",
                        icon = Icons.Rounded.SearchOff
                    )
                }
            }

            hasil.forEach { (grup, modules) ->
                item(span = { GridItemSpan(maxLineSpan) }, key = "h-${grup.title}") {
                    SectionTitle(
                        grup.title,
                        subtitle = "${modules.size} fitur",
                        modifier = Modifier.padding(start = 4.dp, top = 18.dp, bottom = 6.dp)
                    )
                }
                itemsIndexed(modules, key = { _, m -> "${grup.title}-${m.label}" }) { i, m ->
                    ModuleTile(
                        label = m.label,
                        icon = m.icon,
                        tint = m.tint,
                        modifier = Modifier.animateItem(fadeInSpec = BizMotion.medium(), placementSpec = BizMotion.medium(), fadeOutSpec = BizMotion.fast()).enterAnimation(i)
                    ) { viewModel.navigate(m.screen) }
                }
            }
        }
    }
}
