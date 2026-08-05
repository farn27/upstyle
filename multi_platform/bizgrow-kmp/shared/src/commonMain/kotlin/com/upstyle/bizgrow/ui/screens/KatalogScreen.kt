package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import coil3.compose.AsyncImage
import com.upstyle.bizgrow.data.KatalogProduct
import com.upstyle.bizgrow.data.KatalogSettings
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.components.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KatalogScreen(viewModel: AppViewModel) {
    val katalogData by viewModel.katalogData.collectAsState(initial = viewModel.katalogData.value)
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    var showSettingsDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadKatalog() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Katalog Online", fontWeight = FontWeight.Bold)
                        katalogData?.settings?.let {
                            Text(
                                "${it.publishedProducts} dari ${it.totalProducts} dipublikasi",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                },
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } },
                actions = {
                    IconButton(onClick = { showSettingsDialog = true }) {
                        Icon(Icons.Default.Settings, "Pengaturan Katalog")
                    }
                }
            )
        },
        bottomBar = { BottomNavBar(viewModel, com.upstyle.bizgrow.ui.Screen.Katalog) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Portal Info Card
            katalogData?.settings?.let { settings ->
                Card(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = BizgrowColors.PrimaryLight),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Link, null, tint = BizgrowColors.Primary, modifier = Modifier.size(32.dp))
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Portal Katalog", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = BizgrowColors.PrimaryDark)
                            if (settings.isActive && settings.slug.isNotEmpty()) {
                                Text("katalog.bizgrow.id/${settings.slug}", fontSize = 12.sp, color = BizgrowColors.Primary)
                            } else {
                                Text("Belum aktif", fontSize = 12.sp, color = BizgrowColors.Gray500)
                            }
                        }
                        Switch(
                            checked = settings.isActive,
                            onCheckedChange = { isActive ->
                                // Toggle portal active state
                                viewModel.updateKatalogSettings(settings.copy(isActive = isActive))
                            },
                            colors = SwitchDefaults.colors(checkedTrackColor = BizgrowColors.Success)
                        )
                    }
                }
            }

            if (uiState.isLoading && katalogData == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else if (katalogData?.products?.isEmpty() == true) {
                EmptyState(
                    Icons.Default.Storefront,
                    "Belum ada produk",
                    "Tambah produk di menu Produk untuk ditampilkan di katalog"
                )
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(katalogData?.products ?: emptyList(), key = { it.id }) { product ->
                        KatalogProductCard(
                            product = product,
                            onToggle = { viewModel.toggleKatalogPublish(it, !product.isPublished) }
                        )
                    }
                }
            }
        }
    }

    // Settings dialog
    if (showSettingsDialog) {
        katalogData?.settings?.let { settings ->
            KatalogSettingsDialog(
                settings = settings,
                onDismiss = { showSettingsDialog = false },
                onSave = { updated ->
                    viewModel.updateKatalogSettings(updated)
                    showSettingsDialog = false
                }
            )
        } ?: run { showSettingsDialog = false }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KatalogSettingsDialog(
    settings: KatalogSettings,
    onDismiss: () -> Unit,
    onSave: (KatalogSettings) -> Unit
) {
    var namaPortal by remember { mutableStateOf(settings.namaPortal) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Pengaturan Katalog", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = namaPortal,
                    onValueChange = { namaPortal = it },
                    label = { Text("Nama Portal") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Text(
                    "URL: katalog.bizgrow.id/${settings.slug.ifEmpty { "(belum diset)" }}",
                    style = MaterialTheme.typography.bodySmall,
                    color = BizgrowColors.Gray500
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSave(settings.copy(namaPortal = namaPortal)) }) { Text("Simpan") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Batal") } }
    )
}

@Composable
fun KatalogProductCard(product: KatalogProduct, onToggle: (String) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (product.isPublished) Color.White else BizgrowColors.Gray100
        )
    ) {
        Column {
            Box {
                AsyncImage(
                    model = product.foto ?: "https://via.placeholder.com/150",
                    contentDescription = product.nama,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().height(140.dp)
                )
                if (product.isPublished) {
                    Surface(
                        modifier = Modifier.align(Alignment.TopEnd).padding(8.dp),
                        color = BizgrowColors.Success,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            "LIVE",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    product.nama,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = if (product.isPublished) BizgrowColors.Gray950 else BizgrowColors.Gray500
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    product.hargaJual.toRupiah(),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    color = if (product.isPublished) BizgrowColors.Primary else BizgrowColors.Gray500
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { onToggle(product.id) },
                    modifier = Modifier.fillMaxWidth().height(36.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (product.isPublished) BizgrowColors.Danger else BizgrowColors.Success
                    )
                ) {
                    Icon(
                        if (product.isPublished) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                        null, Modifier.size(16.dp)
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        if (product.isPublished) "Sembunyikan" else "Publikasi",
                        fontSize = 11.sp, fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
