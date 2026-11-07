package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.RowScope
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.TopAppBarColors
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * Top bar seragam untuk semua layar di package ini.
 * Karena berada di package yang sama, fungsi ini dipakai menggantikan `material3.TopAppBar`
 * (yang di-import lewat wildcard) — tampilan semua layar lama ikut konsisten dengan design system
 * tanpa harus mengubah satu per satu. Warna khusus yang dikirim layar tetap dihormati.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TopAppBar(
    title: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    navigationIcon: @Composable () -> Unit = {},
    actions: @Composable RowScope.() -> Unit = {},
    colors: TopAppBarColors? = null,
) {
    androidx.compose.material3.TopAppBar(
        title = { ProvideTextStyle(MaterialTheme.typography.titleLarge) { title() } },
        modifier = modifier,
        navigationIcon = navigationIcon,
        actions = actions,
        colors = colors ?: TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.background,
            scrolledContainerColor = MaterialTheme.colorScheme.surface,
            titleContentColor = MaterialTheme.colorScheme.onBackground,
            navigationIconContentColor = MaterialTheme.colorScheme.onBackground,
            actionIconContentColor = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    )
}
