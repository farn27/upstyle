package com.upstyle.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.data.Product
import com.upstyle.ui.MainViewModel
import com.upstyle.ui.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PosScreen(viewModel: MainViewModel) {
    val products by viewModel.products.collectAsStateWithLifecycle()
    val cart by viewModel.cart.collectAsStateWithLifecycle()
    var showCart by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    val total = cart.entries.sumOf { it.key.hargaJual * it.value }
    val cartCount = cart.values.sum()

    LaunchedEffect(Unit) { viewModel.loadProducts() }

    val filtered = products.filter { it.stok > 0 &&
        (searchQuery.isEmpty() || it.nama.contains(searchQuery, ignoreCase = true)) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Kasir POS", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { viewModel.navigate(Screen.Dashboard) }) { Icon(Icons.Default.ArrowBack, null) } },
                actions = {
                    BadgedBox(badge = { if (cartCount > 0) Badge { Text(cartCount.toString()) } }) {
                        IconButton(onClick = { showCart = true }) { Icon(Icons.Default.ShoppingCart, null) }
                    }
                }
            )
        },
        bottomBar = { BottomNavBar(viewModel, Screen.Pos) }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            OutlinedTextField(
                value = searchQuery, onValueChange = { searchQuery = it },
                placeholder = { Text("Cari produk...") },
                leadingIcon = { Icon(Icons.Default.Search, null) },
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shape = RoundedCornerShape(12.dp), singleLine = true
            )
            if (cartCount > 0) {
                Card(Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("$cartCount item • Rp ${"%,.0f".format(total)}", fontWeight = FontWeight.Bold)
                        Button(onClick = { showCart = true }, shape = RoundedCornerShape(8.dp)) { Text("Checkout") }
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filtered) { product ->
                    ProductPosCard(product, cart[product] ?: 0,
                        onAdd = { viewModel.addToCart(product) },
                        onRemove = { viewModel.removeFromCart(product) })
                }
                item(span = { GridItemSpan(2) }) { Spacer(Modifier.height(60.dp)) }
            }
        }
    }

    if (showCart) {
        CartBottomSheet(
            cart = cart,
            total = total,
            onDismiss = { showCart = false },
            onCheckout = { method ->
                viewModel.checkout(method) { ok -> if (ok) showCart = false }
            },
            onRemove = { viewModel.removeFromCart(it) }
        )
    }
}

@Composable
fun ProductPosCard(product: Product, qtyInCart: Int, onAdd: () -> Unit, onRemove: () -> Unit) {
    Card(shape = RoundedCornerShape(12.dp), elevation = CardDefaults.cardElevation(2.dp)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth().height(60.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Inventory, null, Modifier.size(28.dp), tint = MaterialTheme.colorScheme.primary)
                }
            }
            Text(product.nama, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold,
                maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text("Rp ${"%,.0f".format(product.hargaJual)}", style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary)
            Text("Stok: ${product.stok}", style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (qtyInCart > 0) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onRemove, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Remove, null, Modifier.size(16.dp))
                    }
                    Text(qtyInCart.toString(), fontWeight = FontWeight.Bold)
                    IconButton(onClick = onAdd, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Add, null, Modifier.size(16.dp))
                    }
                }
            } else {
                Button(onClick = onAdd, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(4.dp)) {
                    Icon(Icons.Default.AddShoppingCart, null, Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Tambah", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartBottomSheet(
    cart: Map<Product, Int>, total: Double,
    onDismiss: () -> Unit, onCheckout: (String) -> Unit, onRemove: (Product) -> Unit
) {
    var selectedMethod by remember { mutableStateOf("CASH") }
    val methods = listOf("CASH", "QRIS", "TRANSFER", "KARTU")
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Keranjang", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            cart.entries.forEach { (product, qty) ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("${product.nama} x$qty", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    Text("Rp ${"%,.0f".format(product.hargaJual * qty)}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                    IconButton(onClick = { onRemove(product) }, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.Close, null, Modifier.size(14.dp))
                    }
                }
            }
            HorizontalDivider()
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("TOTAL", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black)
                Text("Rp ${"%,.0f".format(total)}", style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
            }
            Text("Metode Pembayaran:", style = MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                methods.forEach { m ->
                    FilterChip(selected = selectedMethod == m, onClick = { selectedMethod = m }, label = { Text(m) })
                }
            }
            Button(onClick = { onCheckout(selectedMethod) }, modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(12.dp)) {
                Icon(Icons.Default.Payment, null)
                Spacer(Modifier.width(8.dp))
                Text("Bayar Sekarang", fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
