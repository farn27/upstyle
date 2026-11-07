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
import com.upstyle.bizgrow.ui.theme.BizMotion
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color

@Composable
fun App(viewModel: AppViewModel, onGoogleSignIn: (() -> Unit)? = null) {
    val themeMode by viewModel.themeMode.collectAsState(initial = viewModel.themeMode.value)
    val gelap = when (themeMode) {
        "dark" -> true
        "light" -> false
        else -> androidx.compose.foundation.isSystemInDarkTheme()
    }
    BizgrowTheme(darkTheme = gelap) {
        val screen by viewModel.screen.collectAsState(initial = viewModel.screen.value)
        val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)

        // Adaptive layout placeholder — on tablets, future enhancement to show side panels
        // val isCompact = LocalConfiguration.current.screenWidthDp < 600 // Android-specific

        val isAuthScreen = screen is Screen.Login || screen is Screen.Register

        // Handle 401 — redirect ke Login dan hapus sesi
        // Guard berlapis:
        //   1. currentScreen: jangan redirect jika sudah di halaman auth
        //   2. isSuppressingAuth: jangan redirect jika login/selectUnit masih suppress aktif
        //      (ini lebih reliable dari isLoading karena pakai AtomicInt counter)
        LaunchedEffect(Unit) {
            viewModel.authEvent.collect {
                val currentScreen = viewModel.screen.value
                val isSuppressing = viewModel.isSuppressingAuth.value
                if (currentScreen !is Screen.Login && currentScreen !is Screen.Register && !isSuppressing) {
                    viewModel.session.clearSession()
                    viewModel.navigateToRoot(Screen.Login)
                }
            }
        }

        // Arah transisi: tumpukan layar memendek = kembali → geser ke kanan; memanjang = maju → geser ke kiri
        val stackSize by viewModel.screenStackFlow.collectAsState(initial = viewModel.screenStack.size)
        var ukuranSebelumnya by remember { mutableStateOf(stackSize) }
        val mundur = stackSize < ukuranSebelumnya
        SideEffect { ukuranSebelumnya = stackSize }

        Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            AnimatedContent(
                targetState = screen,
                transitionSpec = {
                    val arah = if (mundur) -1 else 1
                    val durasi = BizMotion.Medium
                    (slideInHorizontally(tween(durasi, easing = BizMotion.Emphasized)) { arah * it / 6 } +
                        fadeIn(tween(durasi))) togetherWith
                        (slideOutHorizontally(tween(durasi, easing = BizMotion.Emphasized)) { -arah * it / 10 } +
                            fadeOut(tween(durasi / 2)))
                },
                contentKey = { it::class },
                label = "screen_transition"
            ) { target ->
                when (target) {
                    // Auth
                    is Screen.Login    -> LoginScreen(viewModel, onGoogleSignIn = onGoogleSignIn)
                    is Screen.Register -> RegisterScreen(viewModel)

                    // Main Hub
                    is Screen.Home      -> HomeScreen(viewModel)
                    is Screen.Units     -> UnitsScreen(viewModel)
                    is Screen.Dashboard -> DashboardScreen(viewModel)
                    is Screen.Modules   -> ModulesScreen(viewModel)

                    // Finance
                    is Screen.Finance    -> FinanceScreen(viewModel)
                    is Screen.Piutang    -> PiutangScreen(viewModel)
                    is Screen.Hutang     -> HutangScreen(viewModel)
                    is Screen.JurnalUmum -> JurnalUmumScreen(viewModel)
                    is Screen.BukuBesar  -> BukuBesarScreen(viewModel)
                    is Screen.Laporan    -> LaporanScreen(viewModel)

                    // Products
                    is Screen.Products       -> ProductsScreen(viewModel)
                    is Screen.StockLogs      -> StockLogsScreen(viewModel)
                    is Screen.ProdukDetail   -> ProdukDetailScreen(viewModel, target.productId)
                    is Screen.BarcodeScanner -> BarcodeScannerScreen(viewModel)
                    is Screen.StockMovement  -> StockMovementScreen(viewModel, target.productId)
                    is Screen.PricingStrategy -> PricingStrategyScreen(viewModel, target.productId)

                    // POS
                    is Screen.Pos       -> PosScreen(viewModel)
                    is Screen.PosShift  -> PosShiftScreen(viewModel)
                    is Screen.PosReturn -> PosReturnScreen(viewModel)

                    // HR
                    is Screen.Hr      -> HrScreen(viewModel)
                    is Screen.Absensi -> AbsensiScreen(viewModel)
                    is Screen.Payroll -> PayrollScreen(viewModel)

                    // CRM
                    is Screen.Crm           -> CrmScreen(viewModel)
                    is Screen.CrmPipeline   -> CrmPipelineScreen(viewModel)
                    is Screen.CrmContacts   -> CrmContactsScreen(viewModel)
                    is Screen.CrmActivities -> CrmActivitiesScreen(viewModel)

                    // CS - both Screen.Cs and Screen.CsInbox map to the same screen
                    is Screen.Cs           -> CsInboxScreen(viewModel)
                    is Screen.CsInbox      -> CsInboxScreen(viewModel)
                    is Screen.TicketDetail -> TicketDetailScreen(viewModel, target.ticketId)

                    // Ecommerce
                    is Screen.Orders      -> OrdersScreen(viewModel)
                    is Screen.OrderDetail -> OrderDetailScreen(viewModel, target.orderId)

                    // SCM
                    is Screen.Scm -> ScmScreen(viewModel)

                    // AI & Reports
                    is Screen.AiChat    -> AiChatScreen(viewModel)
                    is Screen.LaporanWa -> LaporanWaScreen(viewModel)

                    // System
                    is Screen.Notifications -> NotificationScreen(viewModel)
                    is Screen.Settings      -> SettingsScreen(viewModel)
                    is Screen.Profile       -> ProfileScreen(viewModel)

                    // Advanced Finance
                    is Screen.Coa           -> CoaScreen(viewModel)
                    is Screen.FixedAssets   -> FixedAssetsScreen(viewModel)
                    is Screen.Neraca        -> NeracaScreen(viewModel)
                    is Screen.Budget        -> BudgetScreen(viewModel)
                    is Screen.TaxRates      -> TaxRatesScreen(viewModel)
                    is Screen.ClosingPeriod -> ClosingPeriodScreen(viewModel)

                    // Advanced Products
                    is Screen.StockOpname   -> StockOpnameScreen(viewModel)
                    is Screen.TrashProducts -> TrashProductsScreen(viewModel)
                    is Screen.Pricing       -> PricingScreen(viewModel)

                    // Advanced CRM / Sales
                    is Screen.Quotations         -> QuotationsScreen(viewModel)
                    is Screen.SalesOrders        -> SalesOrdersScreen(viewModel)
                    is Screen.CrmTasks           -> CrmTasksScreen(viewModel)
                    is Screen.SalesTargets       -> SalesTargetsScreen(viewModel)
                    is Screen.MarketingCampaigns -> MarketingCampaignsScreen(viewModel)

                    // Advanced HR
                    is Screen.LeaveRequests -> LeaveRequestsScreen(viewModel)
                    is Screen.Approvals     -> ApprovalsScreen(viewModel)
                    is Screen.Departments   -> DepartmentsScreen(viewModel)

                    // Advanced POS
                    is Screen.PosVouchers -> PosVouchersScreen(viewModel)
                    is Screen.PosQueue -> PosQueueScreen(viewModel)
                    is Screen.AccountingContacts -> AccountingContactsScreen(viewModel)
                    is Screen.PosReport -> PosReportScreen(viewModel)
                    is Screen.PoDetail -> PoDetailScreen(viewModel)
                    is Screen.EmployeeDetail -> EmployeeDetailScreen(viewModel)

                    // Marketing / Katalog
                    is Screen.Katalog  -> KatalogScreen(viewModel)
                    is Screen.Marketing -> MarketingScreen(viewModel)

                    // Feature Gap Closure
                    is Screen.BusinessPlan            -> BusinessPlanScreen(viewModel)
                    is Screen.Sosmed                  -> SosmedScreen(viewModel)
                    is Screen.WebsiteBuilder          -> WebsiteBuilderScreen(viewModel)
                    is Screen.HelpCenter              -> HelpCenterScreen(viewModel)
                    is Screen.AdvancedSettings        -> AdvancedSettingsScreen(viewModel)
                    is Screen.LandingPageScreen       -> LandingPageScreen(viewModel)
                    is Screen.ShopeeIntegrationScreen -> ShopeeIntegrationScreen(viewModel)

                    // Subscription & Billing
                    is Screen.SubscriptionPlans -> SubscriptionPlansScreen(viewModel)
                    is Screen.PlanUpgrade       -> PlanUpgradeScreen(viewModel)
                    is Screen.InvoiceHistory    -> InvoiceHistoryScreen(viewModel)
                    is Screen.UsageMetrics      -> UsageMetricsScreen(viewModel)

                    // Produk lanjutan & sinkronisasi (dulu kosong)
                    is Screen.ProductVariants   -> ProductVariantsScreen(viewModel, target.productId)
                    is Screen.BulkOperations    -> BulkOperationsScreen(viewModel)
                    is Screen.SyncStatus        -> SyncStatusScreen(viewModel)

                    // AI Features
                    is Screen.TransactionEntry -> TransactionEntryScreen(viewModel)

                    // Export / Import
                    is Screen.ExportImport -> ExportImportScreen(viewModel)

                    // Help & Support
                    is Screen.Diagnostics          -> DiagnosticsScreen(viewModel)
                    is Screen.SupportTicketDetail  -> TicketDetailScreen(viewModel, target.ticketId)

                    else -> {}
                }
            }

            // Indikator memuat tipis di atas — tidak menghalangi layar
            AnimatedVisibility(
                visible = uiState.isLoading && !isAuthScreen,
                enter = fadeIn(), exit = fadeOut(),
                modifier = Modifier.align(Alignment.TopCenter)
            ) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth().statusBarsPadding().height(3.dp),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = Color.Transparent
                )
            }

            // Overlay penuh hanya di layar login / daftar
            AnimatedVisibility(uiState.isLoading && isAuthScreen, enter = fadeIn(), exit = fadeOut()) {
                Box(
                    Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background.copy(alpha = 0.55f)),
                    contentAlignment = Alignment.Center
                ) {
                    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 6.dp) {
                        CircularProgressIndicator(Modifier.padding(22.dp).size(30.dp), strokeWidth = 3.dp)
                    }
                }
            }

            // Toast global (error / sukses) — muncul dari bawah, hilang sendiri
            val pesan = uiState.error ?: uiState.successMessage
            val isError = uiState.error != null
            LaunchedEffect(pesan) {
                if (pesan != null) {
                    kotlinx.coroutines.delay(if (isError) 3800 else 2600)
                    viewModel.clearMessages()
                }
            }
            AnimatedVisibility(
                visible = pesan != null,
                enter = slideInVertically(tween(BizMotion.Medium, easing = BizMotion.Emphasized)) { it } + fadeIn(),
                exit = slideOutVertically(tween(BizMotion.Fast)) { it / 2 } + fadeOut(),
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                var terakhir by remember { mutableStateOf(pesan ?: "") }
                var terakhirError by remember { mutableStateOf(isError) }
                if (pesan != null) { terakhir = pesan; terakhirError = isError }
                ToastPill(terakhir, terakhirError, onClose = { viewModel.clearMessages() })
            }
        }
    }
}

@Composable
private fun ToastPill(pesan: String, isError: Boolean, onClose: () -> Unit) {
    val warna = if (isError) BizgrowColors.Danger else BizgrowColors.Success
    Row(
        Modifier
            .navigationBarsPadding()
            .padding(start = 16.dp, end = 16.dp, bottom = 92.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(MaterialTheme.colorScheme.inverseSurface)
            .padding(start = 14.dp, end = 6.dp, top = 10.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier.size(30.dp).clip(CircleShape).background(warna.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                if (isError) Icons.Rounded.ErrorOutline else Icons.Rounded.CheckCircle,
                null, tint = warna, modifier = Modifier.size(18.dp)
            )
        }
        Spacer(Modifier.width(10.dp))
        Text(
            pesan,
            Modifier.weight(1f),
            color = MaterialTheme.colorScheme.inverseOnSurface,
            style = MaterialTheme.typography.bodyMedium,
            maxLines = 3
        )
        IconButton(onClick = onClose, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.Close, "Tutup", tint = MaterialTheme.colorScheme.inverseOnSurface.copy(alpha = 0.7f), modifier = Modifier.size(18.dp))
        }
    }
}
