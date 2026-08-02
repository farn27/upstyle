package com.upstyle.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.data.SessionManager
import com.upstyle.ui.screens.*
import com.upstyle.ui.theme.UpstyleTheme

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        SessionManager.init(applicationContext)
        enableEdgeToEdge()

        setContent {
            UpstyleTheme {
                UpstyleApp(viewModel)
            }
        }
    }
}

@Composable
fun UpstyleApp(viewModel: MainViewModel) {
    val screen by viewModel.screen.collectAsStateWithLifecycle()
    val isLoggedIn by viewModel.isLoggedIn.collectAsStateWithLifecycle()

    when {
        !isLoggedIn -> AuthScreen(viewModel)
        screen is Screen.Login -> AuthScreen(viewModel)
        screen is Screen.Units -> UnitsScreen(viewModel)
        screen is Screen.Dashboard -> DashboardScreen(viewModel)
        screen is Screen.Finance -> FinanceScreen(viewModel)
        screen is Screen.Products -> ProductsScreen(viewModel)
        screen is Screen.Pos -> PosScreen(viewModel)
        screen is Screen.Hr -> HrScreen(viewModel)
        screen is Screen.Crm -> CrmScreen(viewModel)
        screen is Screen.Scm -> ScmScreen(viewModel)
        screen is Screen.AiChat -> AiChatScreen(viewModel)
        screen is Screen.Notifications -> NotificationsScreen(viewModel)
        screen is Screen.Settings -> SettingsScreen(viewModel)
        screen is Screen.LaporanWa -> LaporanWaScreen(viewModel)
        else -> DashboardScreen(viewModel)
    }
}
