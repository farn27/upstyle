package com.upstyle.bizgrow.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.screens.*
import com.upstyle.bizgrow.ui.theme.BizgrowTheme

@Composable
fun App(viewModel: AppViewModel, onGoogleSignIn: (() -> Unit)? = null) {
    BizgrowTheme {
        val screen by viewModel.screen.collectAsState(initial = viewModel.screen.value)
        val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)

        // Auth screens need blocking overlay (login/register actions)
        val isAuthScreen = screen is Screen.Login || screen is Screen.Register

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
                    // â”€â”€â”€ Auth
                    is Screen.Login    -> LoginScreen(viewModel, onGoogleSignIn = onGoogleSignIn)
                    is Screen.Register -> RegisterScreen(viewModel)

                    // â”€â”€â”€ Main Hub
                    is Screen.Home     -> HomeScreen(viewModel)
                    is Screen.Units    -> UnitsScreen(viewModel)
                    is Screen.Dashboard -> DashboardScreen(viewModel)

                    // â”€â”€â”€ Finance
                    is Screen.Finance    -> FinanceScreen(viewModel)
                    is Screen.Piutang    -> PiutangScreen(viewModel)
                    is Screen.Hutang     -> HutangScreen(viewModel)
                    is Screen.JurnalUmum -> JurnalUmumScreen(viewModel)
                    is Screen.BukuBesar  -> BukuBesarScreen(viewModel)
                    is Screen.Laporan    -> LaporanScreen(viewModel)

                    // â”€â”€â”€ Products
                    is Screen.Products      -> ProductsScreen(viewModel)
                    is Screen.StockLogs     -> StockLogsScreen(viewModel)
                    is Screen.ProdukDetail  -> ProdukDetailScreen(viewModel, target.productId)
                    is Screen.BarcodeScanner -> BarcodeScannerScreen(viewModel)

                    // â”€â”€â”€ POS
                    is Screen.Pos       -> PosScreen(viewModel)
                    is Screen.PosShift  -> PosShiftScreen(viewModel)
                    is Screen.PosReturn -> PosReturnScreen(viewModel)

                    // â”€â”€â”€ HR
                    is Screen.Hr       -> HrScreen(viewModel)
                    is Screen.Absensi  -> AbsensiScreen(viewModel)
                    is Screen.Payroll  -> PayrollScreen(viewModel)

                    // â”€â”€â”€ CRM
                    is Screen.Crm           -> CrmScreen(viewModel)
                    is Screen.CrmPipeline   -> CrmPipelineScreen(viewModel)
                    is Screen.CrmContacts   -> CrmContactsScreen(viewModel)
                    is Screen.CrmActivities -> CrmActivitiesScreen(viewModel)

                    // â”€â”€â”€ CS
                    is Screen.CsInbox     -> CsInboxScreen(viewModel)
                    is Screen.TicketDetail -> TicketDetailScreen(viewModel, target.ticketId)

                    // â”€â”€â”€ Ecommerce
                    is Screen.Orders      -> OrdersScreen(viewModel)
                    is Screen.OrderDetail -> OrderDetailScreen(viewModel, target.orderId)

                    // â”€â”€â”€ SCM
                    is Screen.Scm -> ScmScreen(viewModel)

                    // â”€â”€â”€ AI & Reports
                    is Screen.AiChat    -> AiChatScreen(viewModel)
                    is Screen.LaporanWa -> LaporanWaScreen(viewModel)

                    // â”€â”€â”€ System
                    is Screen.Notifications -> NotificationScreen(viewModel)
                    is Screen.Settings      -> SettingsScreen(viewModel)
                    is Screen.Profile       -> ProfileScreen(viewModel)

                    // â”€â”€â”€ Advanced Features
                    is Screen.Coa           -> CoaScreen(viewModel)
                    is Screen.FixedAssets   -> FixedAssetsScreen(viewModel)
                    is Screen.StockOpname   -> StockOpnameScreen(viewModel)
                    is Screen.TrashProducts -> TrashProductsScreen(viewModel)
                    is Screen.Quotations    -> QuotationsScreen(viewModel)
                    is Screen.SalesOrders   -> SalesOrdersScreen(viewModel)
                    is Screen.LeaveRequests -> LeaveRequestsScreen(viewModel)
                    is Screen.PosVouchers   -> PosVouchersScreen(viewModel)
                    is Screen.CrmTasks      -> CrmTasksScreen(viewModel)
                    
                    // Phase 1 New Screens
                    is Screen.Neraca        -> NeracaScreen(viewModel)
                    is Screen.Budget        -> BudgetScreen(viewModel)
                    is Screen.TaxRates      -> TaxRatesScreen(viewModel)
                    is Screen.ClosingPeriod -> ClosingPeriodScreen(viewModel)
                    is Screen.MarketingCampaigns -> MarketingCampaignsScreen(viewModel)
                    is Screen.Pricing       -> PricingScreen(viewModel)
                    
                    // New Missing Features
                    is Screen.SalesTargets  -> SalesTargetsScreen(viewModel)
                    is Screen.Approvals     -> ApprovalsScreen(viewModel)
                    is Screen.Katalog       -> KatalogScreen(viewModel)
                    is Screen.Marketing     -> MarketingScreen(viewModel)
                    is Screen.Departments   -> DepartmentsScreen(viewModel)

                    // Feature Gap Closure
                    is Screen.BusinessPlan           -> BusinessPlanScreen(viewModel)
                    is Screen.Sosmed                 -> SosmedScreen(viewModel)
                    is Screen.WebsiteBuilder         -> WebsiteBuilderScreen(viewModel)
                    is Screen.HelpCenter             -> HelpCenterScreen(viewModel)
                    is Screen.AdvancedSettings       -> AdvancedSettingsScreen(viewModel)
                    is Screen.LandingPageScreen      -> LandingPageScreen(viewModel)
                    is Screen.ShopeeIntegrationScreen -> ShopeeIntegrationScreen(viewModel)
                    else -> {}
                }            }

            // Subtle top linear progress indicator for background operations
            // Does NOT block the UI â€” just shows activity
            if (uiState.isLoading && !isAuthScreen) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                )
            }

            // Full blocking overlay ONLY for auth screens (login/register button presses)
            if (uiState.isLoading && isAuthScreen) {
                Box(
                    Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.6f),
                        modifier = Modifier.fillMaxSize()
                    ) {}
                    CircularProgressIndicator()
                }
            }

            // Global error snackbar
            uiState.error?.let { errorMsg ->
                LaunchedEffect(errorMsg) {
                    kotlinx.coroutines.delay(3500)
                    viewModel.clearMessages()
                }
                Box(
                    Modifier.fillMaxSize().padding(16.dp),
                    contentAlignment = Alignment.BottomCenter
                ) {
                    Snackbar(
                        action = {
                            TextButton(onClick = { viewModel.clearMessages() }) { Text("Tutup") }
                        }
                    ) { Text(errorMsg) }
                }
            }

            // Global success snackbar
            uiState.successMessage?.let { msg ->
                LaunchedEffect(msg) {
                    kotlinx.coroutines.delay(2500)
                    viewModel.clearMessages()
                }
                Box(
                    Modifier.fillMaxSize().padding(16.dp),
                    contentAlignment = Alignment.BottomCenter
                ) {
                    Snackbar(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                    ) { Text(msg) }
                }
            }
        }
    }
}
