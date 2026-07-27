package com.example

import androidx.compose.foundation.isSystemInDarkTheme
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.*
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    private val viewModel: SaaSViewModel by viewModels()

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val themeMode by viewModel.themeMode.collectAsStateWithLifecycle()
            val isDark = when (themeMode) {
                "DARK" -> true
                "LIGHT" -> false
                else -> isSystemInDarkTheme()
            }
            MyApplicationTheme(darkTheme = isDark, dynamicColor = false) {
                val isUserLoggedIn by viewModel.isUserLoggedIn.collectAsStateWithLifecycle()
                val loggedInUserRole by viewModel.loggedInUserRole.collectAsStateWithLifecycle()
                val currentScreen by viewModel.currentScreen.collectAsStateWithLifecycle()
                val activeUnit by viewModel.activeUnit.collectAsStateWithLifecycle()
                val allUnits by viewModel.allUnits.collectAsStateWithLifecycle()

                var showUnitDropdown by remember { mutableStateOf(false) }

                if (!isUserLoggedIn) {
                    LoginScreen(viewModel)
                } else {
                    Scaffold(
                        modifier = Modifier.fillMaxSize(),
                        topBar = {
                            TopAppBar(
                                title = {
                                    Column {
                                        Text(
                                            text = "Bizgrow",
                                            fontWeight = FontWeight.Bold,
                                            style = MaterialTheme.typography.titleMedium
                                        )
                                        Text(
                                            text = activeUnit?.namaUnit ?: "Pilih Toko",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                },
                                actions = {
                                    Box {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            IconButton(onClick = { showUnitDropdown = true }) {
                                                Icon(Icons.Default.SwapHoriz, contentDescription = "Switch Unit")
                                            }
                                            IconButton(onClick = { viewModel.logoutUser() }) {
                                                Icon(
                                                    imageVector = Icons.AutoMirrored.Filled.Logout,
                                                    contentDescription = "Keluar Akun",
                                                    tint = MaterialTheme.colorScheme.error
                                                )
                                            }
                                        }
                                        DropdownMenu(
                                            expanded = showUnitDropdown,
                                            onDismissRequest = { showUnitDropdown = false }
                                        ) {
                                            allUnits.forEach { unit ->
                                                DropdownMenuItem(
                                                    text = { Text(unit.namaUnit) },
                                                    onClick = {
                                                        viewModel.switchUnit(unit.id)
                                                        showUnitDropdown = false
                                                    }
                                                )
                                            }
                                            if (loggedInUserRole != "STAFF") {
                                                HorizontalDivider()
                                                DropdownMenuItem(
                                                    text = { Text("+ Buat Cabang / Unit") },
                                                    onClick = {
                                                        viewModel.navigateTo(Screen.Settings)
                                                        showUnitDropdown = false
                                                    }
                                                )
                                            }
                                        }
                                    }
                                },
                                colors = TopAppBarDefaults.topAppBarColors(
                                    containerColor = MaterialTheme.colorScheme.background
                                )
                            )
                        },
                        bottomBar = {
                            NavigationBar(
                                modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars)
                            ) {
                                if (loggedInUserRole != "STAFF") {
                                    NavigationBarItem(
                                        selected = currentScreen is Screen.Dashboard,
                                        onClick = { viewModel.navigateTo(Screen.Dashboard) },
                                        icon = { Icon(Icons.Default.Dashboard, contentDescription = "Dashboard") },
                                        label = { Text("Dashboard", fontSize = 10.sp) },
                                        modifier = Modifier.testTag("nav_dashboard")
                                    )
                                }
                                NavigationBarItem(
                                    selected = currentScreen is Screen.POS,
                                    onClick = { viewModel.navigateTo(Screen.POS) },
                                    icon = { Icon(Icons.Default.PointOfSale, contentDescription = "POS Kasir") },
                                    label = { Text("POS Kasir", fontSize = 10.sp) },
                                    modifier = Modifier.testTag("nav_pos")
                                )
                                NavigationBarItem(
                                    selected = currentScreen is Screen.Products,
                                    onClick = { viewModel.navigateTo(Screen.Products) },
                                    icon = { Icon(Icons.Default.Inventory2, contentDescription = "Katalog") },
                                    label = { Text("Katalog", fontSize = 10.sp) },
                                    modifier = Modifier.testTag("nav_products")
                                )
                                NavigationBarItem(
                                    selected = currentScreen is Screen.Portal,
                                    onClick = { viewModel.navigateTo(Screen.Portal) },
                                    icon = { Icon(Icons.Default.Badge, contentDescription = "Portal") },
                                    label = { Text("Portal", fontSize = 10.sp) },
                                    modifier = Modifier.testTag("nav_portal")
                                )
                                if (loggedInUserRole != "STAFF") {
                                    NavigationBarItem(
                                        selected = currentScreen is Screen.HR || currentScreen is Screen.CRM || currentScreen is Screen.AIChat || currentScreen is Screen.Settings,
                                        onClick = { 
                                            // Switch to HR / CRM secondary choice screen
                                            // If not in any of them, open the custom grid menu
                                            viewModel.navigateTo(Screen.Settings) 
                                        },
                                        icon = { Icon(Icons.Default.MoreHoriz, contentDescription = "Menu") },
                                        label = { Text("Menu", fontSize = 10.sp) },
                                        modifier = Modifier.testTag("nav_menu")
                                    )
                                }
                            }
                        }
                    ) { innerPadding ->
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(innerPadding)
                        ) {
                            AnimatedContent(
                                targetState = currentScreen,
                                transitionSpec = {
                                    (fadeIn() + scaleIn(initialScale = 0.95f)) togetherWith (fadeOut() + scaleOut(targetScale = 0.95f))
                                },
                                label = "screen_transition"
                            ) { screen ->
                                when (screen) {
                                    is Screen.Dashboard -> DashboardScreen(viewModel)
                                    is Screen.Products -> ProductScreen(viewModel)
                                    is Screen.POS -> PosScreen(viewModel)
                                    is Screen.HR -> HrScreen(viewModel)
                                    is Screen.CRM -> CrmScreen(viewModel)
                                    is Screen.Portal -> PortalScreen(viewModel)
                                    is Screen.AIChat -> AiChatScreen(viewModel)
                                    is Screen.Settings -> MenuHubScreen(viewModel)
                                    is Screen.Supplier -> ScmScreen(viewModel)
                                    is Screen.Accounting -> AccountingScreen(viewModel)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MenuHubScreen(viewModel: SaaSViewModel) {
    val currentScreen by viewModel.currentScreen.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Menu Bizgrow & Layanan",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            item {
                HubMenuItem(
                    title = "HR & Payroll",
                    description = "Data karyawan & slip gaji",
                    icon = Icons.Default.People,
                    color = Color(0xFFE3F2FD),
                    iconColor = Color(0xFF1E88E5),
                    onClick = { viewModel.navigateTo(Screen.HR) }
                )
            }
            item {
                HubMenuItem(
                    title = "CRM Pipeline",
                    description = "Kelola prospek & deals",
                    icon = Icons.Default.FilterList,
                    color = Color(0xFFEDE7F6),
                    iconColor = Color(0xFF5E35B1),
                    onClick = { viewModel.navigateTo(Screen.CRM) }
                )
            }
            item {
                HubMenuItem(
                    title = "Supply Chain (SCM)",
                    description = "Supplier & order PO stok",
                    icon = Icons.Default.LocalShipping,
                    color = Color(0xFFF3E5F5),
                    iconColor = Color(0xFF8E24AA),
                    onClick = { viewModel.navigateTo(Screen.Supplier) }
                )
            }
            item {
                HubMenuItem(
                    title = "AI Business Advisor",
                    description = "Tanya asisten pintar",
                    icon = Icons.Default.SmartToy,
                    color = Color(0xFFE8F5E9),
                    iconColor = Color(0xFF43A047),
                    onClick = { viewModel.navigateTo(Screen.AIChat) }
                )
            }
            item {
                HubMenuItem(
                    title = "Akuntansi & Finansial",
                    description = "Buku Besar, Jurnal & Laporan",
                    icon = Icons.Default.AccountBalanceWallet,
                    color = Color(0xFFFFF1F2),
                    iconColor = Color(0xFFF43F5E),
                    onClick = { viewModel.navigateTo(Screen.Accounting) }
                )
            }
            item {
                HubMenuItem(
                    title = "Billing & Pengaturan",
                    description = "Buat cabang & ganti paket",
                    icon = Icons.Default.Settings,
                    color = Color(0xFFFFF3E0),
                    iconColor = Color(0xFFFB8C00),
                    onClick = { viewModel.navigateTo(Screen.Settings) }
                )
            }
        }

        // Conditionally render Settings inside this screen if Settings is chosen,
        // or let it act as a hub if other secondary sub-screens are navigated
        if (currentScreen is Screen.Settings) {
            Box(
                modifier = Modifier
                    .weight(2f)
                    .fillMaxWidth()
            ) {
                SettingsScreen(viewModel)
            }
        }
    }
}

@Composable
fun HubMenuItem(
    title: String,
    description: String,
    icon: ImageVector,
    color: Color,
    iconColor: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Surface(
                color = color,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.size(44.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = iconColor,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = description,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2
            )
        }
    }
}
