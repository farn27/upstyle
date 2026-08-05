package com.upstyle.bizgrow.ui.components

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen

data class NavItem(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val screen: Screen)

val bottomNavItems = listOf(
    NavItem("Home",     Icons.Default.Home,               Screen.Dashboard),
    NavItem("Keuangan", Icons.Default.AccountBalanceWallet, Screen.Finance),
    NavItem("POS",      Icons.Default.PointOfSale,        Screen.Pos),
    NavItem("Produk",   Icons.Default.Inventory2,         Screen.Products),
    NavItem("Lainnya",  Icons.Default.GridView,           Screen.AiChat),
)

@Composable
fun BottomNavBar(viewModel: AppViewModel, current: Screen) {
    NavigationBar(tonalElevation = 8.dp) {
        bottomNavItems.forEach { item ->
            val isSelected = current::class == item.screen::class
            NavigationBarItem(
                selected    = isSelected,
                onClick     = { if (!isSelected) viewModel.navigateToRoot(item.screen) },
                icon        = { Icon(item.icon, contentDescription = item.label, modifier = Modifier.size(24.dp)) },
                label       = { Text(item.label) },
                alwaysShowLabel = false
            )
        }
    }
}
