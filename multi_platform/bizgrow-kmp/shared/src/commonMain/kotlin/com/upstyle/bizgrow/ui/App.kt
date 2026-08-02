package com.upstyle.bizgrow.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.screens.*
import com.upstyle.bizgrow.ui.theme.BizgrowTheme

@Composable
fun App(viewModel: AppViewModel, onGoogleSignIn: (() -> Unit)? = null) {
    BizgrowTheme {
        val screen by viewModel.screen.collectAsStateWithLifecycle()
        val uiState by viewModel.uiState.collectAsStateWithLifecycle()

        Box(Modifier.fillMaxSize()) {
            AnimatedContent(
                targetState = screen,
                transitionSpec = {
                    slideInHorizontally(tween(300)) { it / 4 } + fadeIn(tween(300)) togetherWith
                    slideOutHorizontally(tween(300)) { -it / 4 } + fadeOut(tween(300))
                },
                label = "screen_transition"
            ) { target ->
                when (target) {
                    // ─── Auth
                    is Screen.Login    -> LoginScreen(viewModel, onGoogleSignIn = onGoogleSignIn)
                    is Screen.Register -> RegisterScreen(viewModel)

                    // ─── Main Hub
                    is Screen.Home     -> HomeScreen(viewModel)
                    is Screen.Units    -> UnitsScreen(viewModel)
                    is Screen.Dashboard -> DashboardScreen(viewModel)

                    // ─── Finance
                    is Screen.Finance    -> FinanceScreen(viewModel)
                    is Screen.Piutang    -> PiutangScreen(viewModel)
                    is Screen.Hutang     -> HutangScreen(viewModel)
                    is Screen.JurnalUmum -> JurnalUmumScreen(viewModel)
                    is Screen.BukuBesar  -> BukuBesarScreen(viewModel)
                    is Screen.Laporan    -> LaporanScreen(viewModel)

                    // ─── Products
                    is Screen.Products      -> ProductsScreen(viewModel)
                    is Screen.StockLogs     -> StockLogsScreen(viewModel)
                    is Screen.ProdukDetail  -> ProdukDetailScreen(viewModel, target.productId)
                    is Screen.BarcodeScanner -> BarcodeScannerScreen(viewModel)

                    // ─── POS
                    is Screen.Pos       -> PosScreen(viewModel)
                    is Screen.PosShift  -> PosShiftScreen(viewModel)
                    is Screen.PosReturn -> PosReturnScreen(viewModel)

                    // ─── HR
                    is Screen.Hr       -> HrScreen(viewModel)
                    is Screen.Absensi  -> AbsensiScreen(viewModel)
                    is Screen.Payroll  -> PayrollScreen(viewModel)

                    // ─── CRM
                    is Screen.Crm           -> CrmScreen(viewModel)
                    is Screen.CrmPipeline   -> CrmPipelineScreen(viewModel)
                    is Screen.CrmContacts   -> CrmContactsScreen(viewModel)
                    is Screen.CrmActivities -> CrmActivitiesScreen(viewModel)

                    // ─── CS
                    is Screen.CsInbox     -> CsInboxScreen(viewModel)
                    is Screen.TicketDetail -> TicketDetailScreen(viewModel, target.ticketId)

                    // ─── Ecommerce
                    is Screen.Orders      -> OrdersScreen(viewModel)
                    is Screen.OrderDetail -> OrderDetailScreen(viewModel, target.orderId)

                    // ─── SCM
                    is Screen.Scm -> ScmScreen(viewModel)

                    // ─── AI & Reports
                    is Screen.AiChat    -> AiChatScreen(viewModel)
                    is Screen.LaporanWa -> LaporanWaScreen(viewModel)

                    // ─── System
                    is Screen.Notifications -> NotificationScreen(viewModel)
                    is Screen.Settings      -> SettingsScreen(viewModel)
                    is Screen.Profile       -> ProfileScreen(viewModel)
                }
            }

            // Global error snackbar
            uiState.error?.let { error ->
                LaunchedEffect(error) {
                    kotlinx.coroutines.delay(3000)
                    viewModel.clearMessages()
                }
                Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.BottomCenter) {
                    Snackbar(
                        action = { TextButton(onClick = { viewModel.clearMessages() }) { Text("Tutup") } }
                    ) { Text(error) }
                }
            }

            // Global success snackbar
            uiState.successMessage?.let { msg ->
                LaunchedEffect(msg) {
                    kotlinx.coroutines.delay(2500)
                    viewModel.clearMessages()
                }
                Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.BottomCenter) {
                    Snackbar(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                    ) { Text(msg) }
                }
            }

            // Global loading overlay
            if (uiState.isLoading) {
                Box(
                    Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.7f),
                        modifier = Modifier.fillMaxSize()
                    ) {}
                    CircularProgressIndicator()
                }
            }
        }
    }
}
