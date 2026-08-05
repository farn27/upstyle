package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.BusinessUnit
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UnitsScreen(viewModel: AppViewModel) {
    val units by viewModel.units.collectAsState(initial = viewModel.units.value)
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)

    var showCreateSheet by remember { mutableStateOf(false) }
    var editUnit by remember { mutableStateOf<BusinessUnit?>(null) }
    var deleteUnit by remember { mutableStateOf<BusinessUnit?>(null) }

    LaunchedEffect(Unit) { viewModel.loadUnits() }

    Scaffold(
        containerColor = BizgrowColors.Background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Unit Bisnis", fontWeight = FontWeight.Black, color = BizgrowColors.Gray950, fontSize = 20.sp)
                        Text("${units.size} bisnis terdaftar", fontSize = 12.sp, color = BizgrowColors.Gray500)
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.navigate(Screen.Settings) }) {
                        Icon(Icons.Default.Settings, null, tint = BizgrowColors.Gray700)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BizgrowColors.Surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateSheet = true },
                containerColor = BizgrowColors.Primary,
                shape = CircleShape
            ) { Icon(Icons.Default.Add, null, tint = BizgrowColors.White) }
        }
    ) { padding ->
        if (units.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Box(
                        modifier = Modifier.size(80.dp).background(BizgrowColors.PrimaryLight, CircleShape),
                        contentAlignment = Alignment.Center
                    ) { Icon(Icons.Default.Storefront, null, Modifier.size(40.dp), tint = BizgrowColors.Primary) }
                    Text("Belum ada bisnis", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = BizgrowColors.Gray950)
                    Text("Tekan + untuk membuat bisnis pertama Anda", fontSize = 14.sp, color = BizgrowColors.Gray500)
                    Button(onClick = { showCreateSheet = true }, shape = RoundedCornerShape(20.dp), colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary)) {
                        Icon(Icons.Default.Add, null, tint = BizgrowColors.White)
                        Spacer(Modifier.width(8.dp))
                        Text("Buat Bisnis Baru", fontWeight = FontWeight.Bold, color = BizgrowColors.White)
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(units, key = { it.id }) { unit ->
                    UnitCard(
                        unit = unit,
                        onClick = { viewModel.selectUnit(unit.id); viewModel.navigate(Screen.Dashboard) },
                        onEdit = { editUnit = unit },
                        onDelete = { deleteUnit = unit }
                    )
                }
                item { Spacer(Modifier.height(80.dp)) }
            }
        }
    }

    if (showCreateSheet) {
        CreateUnitSheet(
            onDismiss = { showCreateSheet = false },
            onSave = { name, type, alamat, telepon, email, modalAwal ->
                viewModel.createUnit(name, type)
                showCreateSheet = false
            }
        )
    }

    editUnit?.let { unit ->
        EditUnitSheet(
            unit = unit,
            onDismiss = { editUnit = null },
            onSave = { unitId, namaUnit, alamat, telepon, email, modalAwal ->
                viewModel.updateUnitSettings(unitId, com.upstyle.bizgrow.data.UpdateUnitSettingsRequest(
                    unitId = unitId, namaUnit = namaUnit, alamat = alamat, telepon = telepon, email = email, modalAwal = modalAwal
                ))
                editUnit = null
            }
        )
    }

    deleteUnit?.let { unit ->
        AlertDialog(
            onDismissRequest = { deleteUnit = null },
            title = { Text("Hapus Bisnis?", fontWeight = FontWeight.Bold) },
            text = { Text("\"${unit.name}\" akan dihapus permanen. Data transaksi di dalamnya juga akan hilang.") },
            confirmButton = {
                Button(
                    onClick = { viewModel.deleteUnit(unit.id); deleteUnit = null },
                    colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Danger)
                ) { Text("Hapus", color = BizgrowColors.White) }
            },
            dismissButton = { TextButton(onClick = { deleteUnit = null }) { Text("Batal") } }
        )
    }
}

@Composable
fun UnitCard(unit: BusinessUnit, onClick: () -> Unit, onEdit: () -> Unit, onDelete: () -> Unit) {
    val icon = when (unit.type.lowercase()) {
        "fnb", "fnb_resto", "fnb_coffee", "fnb_catering" -> Icons.Rounded.LocalDining
        "retail", "retail_minimarket", "retail_fashion" -> Icons.Rounded.Store
        "layanan", "jasa", "layanan_bengkel", "layanan_laundry", "layanan_salon" -> Icons.Rounded.Build
        "tech", "tech_software" -> Icons.Default.Code
        else -> Icons.Rounded.Storefront
    }
    val typeColor = when (unit.type.lowercase().split("_").first()) {
        "fnb" -> BizgrowColors.Warning
        "retail" -> BizgrowColors.Success
        "tech" -> BizgrowColors.Primary
        else -> BizgrowColors.Secondary
    }

    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(52.dp).background(typeColor.copy(alpha = 0.12f), RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center
                ) { Icon(icon, null, Modifier.size(28.dp), tint = typeColor) }
                Spacer(Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(unit.name, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BizgrowColors.Gray950, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Surface(color = typeColor.copy(alpha = 0.1f), shape = RoundedCornerShape(6.dp)) {
                            Text(unit.type.replace("_", " "), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = typeColor, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                        }
                        if (unit.isCabang == 1) {
                            Surface(color = BizgrowColors.Gray100, shape = RoundedCornerShape(6.dp)) {
                                Text("Cabang", fontSize = 10.sp, color = BizgrowColors.Gray500, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                        }
                    }
                }
                Row {
                    IconButton(onClick = onEdit, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Edit, null, Modifier.size(18.dp), tint = BizgrowColors.Gray500)
                    }
                    IconButton(onClick = onDelete, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Delete, null, Modifier.size(18.dp), tint = BizgrowColors.Danger.copy(alpha = 0.7f))
                    }
                }
            }
            if (!unit.alamat.isNullOrBlank() || !unit.telepon.isNullOrBlank() || unit.modalAwal > 0) {
                Spacer(Modifier.height(10.dp))
                HorizontalDivider(color = BizgrowColors.Gray100)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    if (!unit.alamat.isNullOrBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Default.LocationOn, null, Modifier.size(13.dp), tint = BizgrowColors.Gray400)
                            Text(unit.alamat!!, fontSize = 11.sp, color = BizgrowColors.Gray500, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                    if (unit.modalAwal > 0) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Default.AccountBalance, null, Modifier.size(13.dp), tint = BizgrowColors.Gray400)
                            Text("Modal: Rp ${"%,.0f".format(unit.modalAwal)}", fontSize = 11.sp, color = BizgrowColors.Gray500)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateUnitSheet(
    onDismiss: () -> Unit,
    onSave: (name: String, type: String, alamat: String, telepon: String, email: String, modalAwal: Double) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf("RETAIL") }
    var alamat by remember { mutableStateOf("") }
    var telepon by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var modalAwal by remember { mutableStateOf("") }

    val businessTypes = listOf(
        "RETAIL" to "Toko/Retail",
        "FNB" to "FnB/Kuliner",
        "JASA" to "Jasa/Layanan",
        "TECH" to "Teknologi",
        "HEALTH" to "Kesehatan",
        "PROPERTI" to "Properti",
        "LAINNYA" to "Lainnya"
    )

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = BizgrowColors.Surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text("Bisnis Baru", fontSize = 22.sp, fontWeight = FontWeight.Black, color = BizgrowColors.Gray950)
                TextButton(onClick = onDismiss) { Text("Batal", color = BizgrowColors.Gray500) }
            }

            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text("Nama Bisnis *") },
                leadingIcon = { Icon(Icons.Default.Storefront, null, tint = BizgrowColors.Gray400) },
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300)
            )

            Column {
                Text("Tipe Bisnis *", fontSize = 13.sp, color = BizgrowColors.Gray700, fontWeight = FontWeight.Medium)
                Spacer(Modifier.height(8.dp))
                androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(businessTypes) { (type, label) ->
                        val isSelected = selectedType == type
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSelected) BizgrowColors.Primary else BizgrowColors.White,
                            contentColor = if (isSelected) BizgrowColors.White else BizgrowColors.Gray700,
                            modifier = Modifier.clickable { selectedType = type },
                            tonalElevation = if (!isSelected) 2.dp else 0.dp
                        ) {
                            Text(label, modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp), fontSize = 13.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
            }

            HorizontalDivider(color = BizgrowColors.Gray100)
            Text("Informasi Tambahan (opsional)", fontSize = 13.sp, color = BizgrowColors.Gray500, fontWeight = FontWeight.Medium)

            OutlinedTextField(value = alamat, onValueChange = { alamat = it }, label = { Text("Alamat") },
                leadingIcon = { Icon(Icons.Default.LocationOn, null, tint = BizgrowColors.Gray400) },
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300))

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = telepon, onValueChange = { telepon = it }, label = { Text("Telepon") },
                    modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300))
                OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") },
                    modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300))
            }

            OutlinedTextField(value = modalAwal, onValueChange = { modalAwal = it }, label = { Text("Modal Awal (Rp)") },
                leadingIcon = { Icon(Icons.Default.AccountBalance, null, tint = BizgrowColors.Gray400) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300))

            Button(
                onClick = {
                    if (name.isNotBlank()) {
                        onSave(name, selectedType, alamat, telepon, email, modalAwal.toDoubleOrNull() ?: 0.0)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(20.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary),
                enabled = name.isNotBlank()
            ) {
                Icon(Icons.Default.Add, null, tint = BizgrowColors.White)
                Spacer(Modifier.width(8.dp))
                Text("Buat Bisnis", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = BizgrowColors.White)
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditUnitSheet(
    unit: BusinessUnit,
    onDismiss: () -> Unit,
    onSave: (unitId: Int, name: String, alamat: String?, telepon: String?, email: String?, modalAwal: Double?) -> Unit
) {
    var name by remember { mutableStateOf(unit.name) }
    var alamat by remember { mutableStateOf(unit.alamat ?: "") }
    var telepon by remember { mutableStateOf(unit.telepon ?: "") }
    var email by remember { mutableStateOf(unit.email ?: "") }
    var modalAwal by remember { mutableStateOf(if (unit.modalAwal > 0) unit.modalAwal.toLong().toString() else "") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = BizgrowColors.Surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text("Edit Bisnis", fontSize = 22.sp, fontWeight = FontWeight.Black, color = BizgrowColors.Gray950)
                TextButton(onClick = onDismiss) { Text("Batal", color = BizgrowColors.Gray500) }
            }

            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Nama Bisnis *") },
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300))

            OutlinedTextField(value = alamat, onValueChange = { alamat = it }, label = { Text("Alamat") },
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300))

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = telepon, onValueChange = { telepon = it }, label = { Text("Telepon") },
                    modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300))
                OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") },
                    modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300))
            }

            OutlinedTextField(value = modalAwal, onValueChange = { modalAwal = it }, label = { Text("Modal Awal (Rp)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = BizgrowColors.Primary, unfocusedBorderColor = BizgrowColors.Gray300))

            Button(
                onClick = {
                    if (name.isNotBlank()) {
                        onSave(unit.id, name, alamat.ifBlank { null }, telepon.ifBlank { null }, email.ifBlank { null }, modalAwal.toDoubleOrNull())
                    }
                },
                modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(20.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary),
                enabled = name.isNotBlank()
            ) {
                Icon(Icons.Default.Save, null, tint = BizgrowColors.White)
                Spacer(Modifier.width(8.dp))
                Text("Simpan Perubahan", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = BizgrowColors.White)
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}
