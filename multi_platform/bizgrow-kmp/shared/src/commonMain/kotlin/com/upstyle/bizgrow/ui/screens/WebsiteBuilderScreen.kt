package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.components.BizCard
import com.upstyle.bizgrow.ui.components.EmptyState
import com.upstyle.bizgrow.ui.components.ErrorState
import com.upstyle.bizgrow.ui.components.StatusBadge
import com.upstyle.bizgrow.ui.theme.BizgrowColors

private fun parseHexColor(value: String, fallback: Color): Color {
    val hex = value.trim().removePrefix("#")
    if (hex.length != 6) return fallback
    val rgb = hex.toLongOrNull(16) ?: return fallback
    return Color(
        red = ((rgb shr 16) and 0xFF) / 255f,
        green = ((rgb shr 8) and 0xFF) / 255f,
        blue = (rgb and 0xFF) / 255f
    )
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun WebsiteBuilderScreen(viewModel: AppViewModel) {
    val state by viewModel.websiteState.collectAsState(initial = viewModel.websiteState.value)

    var slug by remember { mutableStateOf("") }
    var theme by remember { mutableStateOf("default") }
    var primaryColor by remember { mutableStateOf("#5B5FEF") }
    var heroTitle by remember { mutableStateOf("") }
    var heroSubtitle by remember { mutableStateOf("") }
    var aboutUs by remember { mutableStateOf("") }
    var contactPhone by remember { mutableStateOf("") }
    var contactEmail by remember { mutableStateOf("") }
    var contactAddress by remember { mutableStateOf("") }
    var isPublished by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadWebsiteSettings() }

    LaunchedEffect(state.settings) {
        state.settings?.let { s ->
            slug = s.domainSlug
            theme = s.theme
            primaryColor = s.colorPrimary
            heroTitle = s.heroTitle
            heroSubtitle = s.heroSubtitle
            aboutUs = s.aboutUs
            contactPhone = s.contactPhone
            contactEmail = s.contactEmail
            contactAddress = s.contactAddress
            isPublished = s.isPublished
        }
    }

    Scaffold(
        containerColor = BizgrowColors.Background,
        topBar = {
            TopAppBar(
                title = {
                    Text("Website Builder", fontWeight = FontWeight.Black, color = BizgrowColors.Gray950, fontSize = 20.sp)
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = BizgrowColors.Gray900)
                    }
                },
                actions = {
                    IconButton(onClick = { /* Preview: open in browser */ }) {
                        Icon(Icons.Default.Visibility, contentDescription = "Preview", tint = BizgrowColors.Gray900)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BizgrowColors.Surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    val current = state.settings
                    val unitId = current?.unitId ?: 0
                    viewModel.saveWebsiteSettings(
                        com.upstyle.bizgrow.data.WebsiteSetting(
                            id = current?.id ?: 0,
                            unitId = unitId,
                            domainSlug = slug.trim(),
                            theme = theme,
                            colorPrimary = primaryColor,
                            heroTitle = heroTitle.trim(),
                            heroSubtitle = heroSubtitle.trim(),
                            aboutUs = aboutUs.trim(),
                            contactPhone = contactPhone.trim(),
                            contactEmail = contactEmail.trim(),
                            contactAddress = contactAddress.trim(),
                            isPublished = isPublished
                        )
                    )
                },
                containerColor = BizgrowColors.Primary,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp),
                elevation = FloatingActionButtonDefaults.elevation(2.dp)
            ) {
                Icon(Icons.Default.Check, contentDescription = "Simpan")
            }
        },
        bottomBar = { BottomNavBar(viewModel, Screen.WebsiteBuilder) }
    ) { paddingValues ->
        if (state.isLoading && state.settings == null) {
            Box(Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BizgrowColors.Primary)
            }
        } else if (state.error != null && state.settings == null) {
            ErrorState(message = state.error ?: "Gagal memuat", onRetry = { viewModel.loadWebsiteSettings() })
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(paddingValues),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Preview Live", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BizgrowColors.Gray950)
                            Text("Tampilan ponsel secara real-time", fontSize = 12.sp, color = BizgrowColors.Gray500)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(if (isPublished) "Published" else "Draft", style = MaterialTheme.typography.bodySmall, color = if (isPublished) BizgrowColors.Success else BizgrowColors.Gray500)
                            Switch(checked = isPublished, onCheckedChange = { isPublished = it })
                        }
                    }
                }

                item {
                    PhoneMockup(
                        title = heroTitle.ifBlank { "Judul Hero" },
                        subtitle = heroSubtitle.ifBlank { "Subtitle hero" },
                        color = parseHexColor(primaryColor, BizgrowColors.Primary)
                    )
                }

                item { SectionTitle("Identitas Website") }
                item {
                    BizCard {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = slug,
                                onValueChange = { slug = it },
                                label = { Text("Domain Slug *") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                singleLine = true,
                                leadingIcon = { Icon(Icons.Default.Public, null, tint = BizgrowColors.Gray400) }
                            )
                            Text("/bizgrow.app/site/$slug", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray500)
                        }
                    }
                }

                item { SectionTitle("Tampilan") }
                item {
                    BizCard {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            ThemeSelector(selected = theme) { theme = it }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("Warna Utama", modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                                OutlinedTextField(
                                    value = primaryColor,
                                    onValueChange = { primaryColor = it },
                                    modifier = Modifier.width(120.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true
                                )
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape)
                                        .background(
                                            parseHexColor(primaryColor, BizgrowColors.Gray300)
                                        )
                                        .border(1.dp, BizgrowColors.Gray200, CircleShape)
                                )
                            }
                        }
                    }
                }

                item { SectionTitle("Konten Hero") }
                item {
                    BizCard {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = heroTitle,
                                onValueChange = { heroTitle = it },
                                label = { Text("Hero Title") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = heroSubtitle,
                                onValueChange = { heroSubtitle = it },
                                label = { Text("Hero Subtitle") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                singleLine = true
                            )
                        }
                    }
                }

                item { SectionTitle("Tentang Kami") }
                item {
                    BizCard {
                        OutlinedTextField(
                            value = aboutUs,
                            onValueChange = { aboutUs = it },
                            label = { Text("About Us") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            minLines = 3
                        )
                    }
                }

                item { SectionTitle("Kontak") }
                item {
                    BizCard {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = contactPhone,
                                onValueChange = { contactPhone = it },
                                label = { Text("Telepon") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = contactEmail,
                                onValueChange = { contactEmail = it },
                                label = { Text("Email") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = contactAddress,
                                onValueChange = { contactAddress = it },
                                label = { Text("Alamat") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                minLines = 2
                            )
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
fun PhoneMockup(title: String, subtitle: String, color: Color) {
    BizCard {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(9f / 16f)
                    .clip(RoundedCornerShape(24.dp))
                    .background(BizgrowColors.Gray100)
                    .border(1.dp, BizgrowColors.Gray200, RoundedCornerShape(24.dp)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(color)
                    )
                    Text(title, fontWeight = FontWeight.Black, color = color, fontSize = 14.sp)
                    Text(subtitle, color = BizgrowColors.Gray600, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun ThemeSelector(selected: String, onSelect: (String) -> Unit) {
    val themes = listOf("default", "modern", "minimal", "bold")
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        themes.forEach { t ->
            val isSelected = selected == t
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = if (isSelected) BizgrowColors.Primary else BizgrowColors.White,
                contentColor = if (isSelected) Color.White else BizgrowColors.Gray700,
                border = if (!isSelected) androidx.compose.foundation.BorderStroke(1.dp, BizgrowColors.Gray200) else null,
                modifier = Modifier.clickable { onSelect(t) }
            ) {
                Text(
                    text = t.replaceFirstChar { it.titlecase() },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    fontSize = 13.sp
                )
            }
        }
    }
}

@Composable
fun SectionTitle(title: String) {
    Text(title, style = MaterialTheme.typography.labelLarge, color = BizgrowColors.Gray700, fontWeight = FontWeight.Bold)
}
