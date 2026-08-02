package com.upstyle.bizgrow.ui.screens

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen

@Composable
fun BottomNavBar(viewModel: AppViewModel, currentScreen: Screen) {
    NavigationBar {
        NavigationBarItem(
            icon = { Icon(Icons.Default.Home, contentDescription = "Dashboard") },
            label = { Text("Dashboard") },
            selected = currentScreen is Screen.Dashboard,
            onClick = { viewModel.navigate(Screen.Dashboard) }
        )
        NavigationBarItem(
            icon = { Icon(Icons.Default.PointOfSale, contentDescription = "POS") },
            label = { Text("POS") },
            selected = currentScreen is Screen.Pos,
            onClick = { viewModel.navigate(Screen.Pos) }
        )
        NavigationBarItem(
            icon = { Icon(Icons.Default.Inventory, contentDescription = "Produk") },
            label = { Text("Produk") },
            selected = currentScreen is Screen.Products,
            onClick = { viewModel.navigate(Screen.Products) }
        )
        NavigationBarItem(
            icon = { Icon(Icons.Default.AccountBalanceWallet, contentDescription = "Finance") },
            label = { Text("Finance") },
            selected = currentScreen is Screen.Finance,
            onClick = { viewModel.navigate(Screen.Finance) }
        )
        NavigationBarItem(
            icon = { Icon(Icons.Default.Chat, contentDescription = "AI Chat") },
            label = { Text("AI") },
            selected = currentScreen is Screen.AiChat,
            onClick = { viewModel.navigate(Screen.AiChat) }
        )
    }
}
