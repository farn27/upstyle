package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen

@Composable
fun BottomNavBar(viewModel: AppViewModel, currentScreen: Screen) {
    val unreadCount by viewModel.unreadCount.collectAsState()

    NavigationBar(
        tonalElevation = 4.dp,
    ) {
        NavigationBarItem(
            icon = { Icon(Icons.Default.Home, null, Modifier.size(22.dp)) },
            label = { Text("Home", fontSize = 10.sp) },
            selected = currentScreen is Screen.Dashboard,
            onClick = { viewModel.navigateToRoot(Screen.Dashboard) }
        )
        NavigationBarItem(
            icon = { Icon(Icons.Default.PointOfSale, null, Modifier.size(22.dp)) },
            label = { Text("POS", fontSize = 10.sp) },
            selected = currentScreen is Screen.Pos,
            onClick = { viewModel.navigate(Screen.Pos) }
        )
        NavigationBarItem(
            icon = { Icon(Icons.Default.Inventory2, null, Modifier.size(22.dp)) },
            label = { Text("Produk", fontSize = 10.sp) },
            selected = currentScreen is Screen.Products,
            onClick = { viewModel.navigate(Screen.Products) }
        )
        NavigationBarItem(
            icon = { Icon(Icons.Default.AccountBalanceWallet, null, Modifier.size(22.dp)) },
            label = { Text("Keuangan", fontSize = 10.sp) },
            selected = currentScreen is Screen.Finance,
            onClick = { viewModel.navigate(Screen.Finance) }
        )
        NavigationBarItem(
            icon = {
                BadgedBox(badge = {
                    if (unreadCount > 0) Badge { Text(if (unreadCount > 9) "9+" else unreadCount.toString()) }
                }) {
                    Icon(Icons.Default.Person, null, Modifier.size(22.dp))
                }
            },
            label = { Text("Profil", fontSize = 10.sp) },
            selected = currentScreen is Screen.Profile,
            onClick = { viewModel.navigate(Screen.Profile) }
        )
    }
}
