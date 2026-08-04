package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.data.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BarcodeScannerScreen(viewModel: AppViewModel) {
    var manualBarcode by remember { mutableStateOf("") }
    var searchResultId by remember { mutableStateOf<String?>(null) }
    
    val products by viewModel.products.collectAsState()
    val searchResult = searchResultId?.let { id -> products.find { it.id == id } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Scan Barcode", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            
            // Scanner UI Overlay
            Box(
                modifier = Modifier
                    .size(280.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color(0xFF121212))
                    .border(2.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f), RoundedCornerShape(24.dp)),
                contentAlignment = Alignment.Center
            ) {
                // Background dark camera feel
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Default.QrCodeScanner,
                        contentDescription = "Camera simulated",
                        modifier = Modifier.size(80.dp),
                        tint = Color.White.copy(alpha = 0.2f)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "Mencari Barcode...", 
                        color = Color.White.copy(alpha = 0.5f),
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                // Laser animation
                val infiniteTransition = rememberInfiniteTransition(label = "laser")
                val offset by infiniteTransition.animateFloat(
                    initialValue = 20f,
                    targetValue = 260f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(1500, easing = LinearEasing),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "laser_offset"
                )

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .offset(y = (offset - 140).dp) // Center offset calculation roughly
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(Color.Transparent, Color.Red, Color.Transparent)
                            )
                        )
                        .padding(horizontal = 16.dp)
                )
                
                // Corner Brackets (Visuals)
                ScannerBrackets()
            }

            Text(
                text = "Arahkan kamera ke barcode produk",
                style = MaterialTheme.typography.titleMedium,
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.Medium
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Atau masukkan manual:", style = MaterialTheme.typography.labelLarge)
                    
                    OutlinedTextField(
                        value = manualBarcode,
                        onValueChange = { manualBarcode = it },
                        placeholder = { Text("Contoh: 89912345678") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        singleLine = true
                    )

                    Button(
                        onClick = {
                            val p = products.find { it.barcode == manualBarcode }
                            searchResultId = p?.id ?: "NOT_FOUND"
                        },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Text("Cari Produk", fontWeight = FontWeight.Bold)
                    }
                }
            }

            if (searchResult != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(searchResult.nama, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                                Text("Barcode: ${searchResult.barcode}", style = MaterialTheme.typography.bodyMedium)
                            }
                            Text(
                                "Rp ${"%,.0f".format(searchResult.hargaJual.toDouble())}", 
                                fontWeight = FontWeight.Bold, 
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Button(
                            onClick = {
                                viewModel.addToCart(searchResult)
                                viewModel.navigateBack() // Go back after adding to cart makes sense for POS flow
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Text("Tambah ke Keranjang", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            } else if (searchResultId == "NOT_FOUND") {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text(
                        "Produk tidak ditemukan.", 
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(16.dp),
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
fun BoxScope.ScannerBrackets() {
    val cornerSize = 40.dp
    val strokeWidth = 4.dp
    val color = MaterialTheme.colorScheme.primary

    // Top Left
    Box(modifier = Modifier.align(Alignment.TopStart).padding(16.dp).size(cornerSize)) {
        Box(modifier = Modifier.fillMaxWidth().height(strokeWidth).background(color, RoundedCornerShape(topStart = 8.dp)))
        Box(modifier = Modifier.fillMaxHeight().width(strokeWidth).background(color, RoundedCornerShape(topStart = 8.dp)))
    }
    // Top Right
    Box(modifier = Modifier.align(Alignment.TopEnd).padding(16.dp).size(cornerSize)) {
        Box(modifier = Modifier.fillMaxWidth().height(strokeWidth).background(color, RoundedCornerShape(topEnd = 8.dp)))
        Box(modifier = Modifier.fillMaxHeight().width(strokeWidth).align(Alignment.TopEnd).background(color, RoundedCornerShape(topEnd = 8.dp)))
    }
    // Bottom Left
    Box(modifier = Modifier.align(Alignment.BottomStart).padding(16.dp).size(cornerSize)) {
        Box(modifier = Modifier.fillMaxWidth().height(strokeWidth).align(Alignment.BottomStart).background(color, RoundedCornerShape(bottomStart = 8.dp)))
        Box(modifier = Modifier.fillMaxHeight().width(strokeWidth).background(color, RoundedCornerShape(bottomStart = 8.dp)))
    }
    // Bottom Right
    Box(modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp).size(cornerSize)) {
        Box(modifier = Modifier.fillMaxWidth().height(strokeWidth).align(Alignment.BottomEnd).background(color, RoundedCornerShape(bottomEnd = 8.dp)))
        Box(modifier = Modifier.fillMaxHeight().width(strokeWidth).align(Alignment.BottomEnd).background(color, RoundedCornerShape(bottomEnd = 8.dp)))
    }
}
