package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.upstyle.bizgrow.data.SocialPost
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.components.BizCard
import com.upstyle.bizgrow.ui.components.EmptyState
import com.upstyle.bizgrow.ui.components.ErrorState
import com.upstyle.bizgrow.ui.components.StatusBadge
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun SosmedScreen(viewModel: AppViewModel) {
    val state by viewModel.sosmedState.collectAsState()
    val uiState by viewModel.uiState.collectAsState()

    var showCreate by remember { mutableStateOf(false) }
    var editingPost by remember { mutableStateOf<SocialPost?>(null) }
    var postCaption by remember { mutableStateOf("") }
    var postImageUrl by remember { mutableStateOf("") }
    var postPlatform by remember { mutableStateOf("Instagram") }
    var postScheduled by remember { mutableStateOf("") }
    var postStatus by remember { mutableStateOf("DRAFT") }
    var deleteTarget by remember { mutableStateOf<SocialPost?>(null) }
    var isGeneratingCaption by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { viewModel.loadSosmedPosts() }

    val filteredPosts = state.posts.filter {
        val matchSearch = it.caption.contains(searchQuery, ignoreCase = true) ||
                it.platform.contains(searchQuery, ignoreCase = true)
        matchSearch
    }

    Scaffold(
        containerColor = BizgrowColors.Background,
        topBar = {
            TopAppBar(
                title = {
                    Text("Social Media Planner", fontWeight = FontWeight.Black, color = BizgrowColors.Gray950, fontSize = 20.sp)
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = BizgrowColors.Gray900)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BizgrowColors.Surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    postCaption = ""
                    postImageUrl = ""
                    postPlatform = "Instagram"
                    postScheduled = ""
                    postStatus = "DRAFT"
                    editingPost = null
                    showCreate = true
                },
                containerColor = BizgrowColors.Primary,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp),
                elevation = FloatingActionButtonDefaults.elevation(2.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Buat Post")
            }
        },
        bottomBar = { BottomNavBar(viewModel, Screen.Sosmed) }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Cari post / platform...", color = BizgrowColors.Gray400) },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = BizgrowColors.Gray400) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                shape = RoundedCornerShape(20.dp),
                singleLine = true,
                colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BizgrowColors.Primary,
                    unfocusedBorderColor = BizgrowColors.Gray200,
                    focusedContainerColor = BizgrowColors.White,
                    unfocusedContainerColor = BizgrowColors.White
                )
            )

            if (state.isLoading && state.posts.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BizgrowColors.Primary)
                }
            } else if (state.error != null && state.posts.isEmpty()) {
                ErrorState(message = state.error ?: "Gagal memuat", onRetry = { viewModel.loadSosmedPosts() })
            } else if (filteredPosts.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.Image,
                    title = if (searchQuery.isNotEmpty()) "Tidak ada hasil" else "Belum ada postingan",
                    subtitle = if (searchQuery.isNotEmpty()) "Coba kata kunci lain" else "Buat jadwal postingan pertama",
                    actionLabel = if (searchQuery.isEmpty()) "Buat Post" else null,
                    onAction = {
                        postCaption = ""
                        postImageUrl = ""
                        postPlatform = "Instagram"
                        postScheduled = ""
                        postStatus = "DRAFT"
                        editingPost = null
                        showCreate = true
                    }
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredPosts, key = { it.id }) { post ->
                        SosmedPostCard(
                            post = post,
                            onEdit = {
                                editingPost = it
                                postCaption = it.caption
                                postImageUrl = it.imageUrl
                                postPlatform = it.platform
                                postScheduled = it.scheduledAt.orEmpty()
                                postStatus = it.status
                                showCreate = true
                            },
                            onDelete = { deleteTarget = it }
                        )
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }

    if (showCreate) {
        AlertDialog(
            onDismissRequest = {
                showCreate = false
                editingPost = null
            },
            title = {
                Text(if (editingPost == null) "Buat Postingan" else "Edit Postingan", fontWeight = FontWeight.Bold)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.verticalScroll(rememberScrollState())) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PlatformChip("Instagram", postPlatform == "Instagram", listOf(Color(0xFFE1306C), Color(0xFFF56040))) { postPlatform = "Instagram" }
                        PlatformChip("Facebook", postPlatform == "Facebook", listOf(Color(0xFF1877F2), Color(0xFF42B0FF))) { postPlatform = "Facebook" }
                        PlatformChip("TikTok", postPlatform == "TikTok", listOf(Color(0xFF010101), Color(0xFF69C9D0))) { postPlatform = "TikTok" }
                    }
                    OutlinedTextField(
                        value = postCaption,
                        onValueChange = { postCaption = it },
                        label = { Text("Caption") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        minLines = 3
                    )
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = postImageUrl,
                            onValueChange = { postImageUrl = it },
                            label = { Text("URL Gambar") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(16.dp),
                            singleLine = true
                        )
                        IconButton(onClick = { /* handled by link input */ }) {
                            Icon(Icons.Default.Image, contentDescription = null, tint = BizgrowColors.Gray500)
                        }
                    }
                    OutlinedTextField(
                        value = postScheduled,
                        onValueChange = { postScheduled = it },
                        label = { Text("Jadwal (yyyy-MM-dd HH:mm)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true,
                        trailingIcon = { Icon(Icons.Default.CalendarToday, null, tint = BizgrowColors.Gray400) }
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Status", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray700)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            StatusChip("DRAFT", postStatus == "DRAFT", BizgrowColors.Warning) { postStatus = "DRAFT" }
                            StatusChip("SCHEDULED", postStatus == "SCHEDULED", BizgrowColors.Primary) { postStatus = "SCHEDULED" }
                        }
                    }
                    OutlinedButton(
                        onClick = {
                            isGeneratingCaption = true
                            viewModel.generateAiCaption(postPlatform, postPlatform) { caption ->
                                postCaption = caption
                                isGeneratingCaption = false
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        enabled = !isGeneratingCaption
                    ) {
                        if (isGeneratingCaption) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = BizgrowColors.Primary)
                        } else {
                            Icon(Icons.Default.AutoAwesome, null, tint = BizgrowColors.Primary)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (isGeneratingCaption) "Membuat caption..." else "AI Caption", color = BizgrowColors.Primary, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (postCaption.isBlank()) return@Button
                        if (editingPost == null) {
                            viewModel.createSosmedPost(postPlatform, postCaption, postImageUrl, postScheduled, postStatus)
                        } else {
                            viewModel.updateSosmedPost(editingPost!!.id, postPlatform, postCaption, postImageUrl, postScheduled, postStatus)
                        }
                        showCreate = false
                        editingPost = null
                    },
                    enabled = postCaption.isNotBlank(),
                    shape = RoundedCornerShape(12.dp)
                ) { Text("Simpan") }
            },
            dismissButton = {
                TextButton(onClick = { showCreate = false; editingPost = null }) { Text("Batal") }
            }
        )
    }

    if (deleteTarget != null) {
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Hapus Postingan", fontWeight = FontWeight.Bold) },
            text = { Text("Hapus postingan \"${deleteTarget?.caption?.take(50)}\"?") },
            confirmButton = {
                Button(
                    onClick = { viewModel.deleteSosmedPost(deleteTarget!!.id); deleteTarget = null },
                    colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Danger),
                    shape = RoundedCornerShape(12.dp)
                ) { Text("Hapus") }
            },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text("Batal") } }
        )
    }
}

@Composable
fun SosmedPostCard(post: SocialPost, onEdit: (SocialPost) -> Unit, onDelete: (SocialPost) -> Unit) {
    var showMenu by remember { mutableStateOf(false) }
    val platformColor = when (post.platform.uppercase()) {
        "INSTAGRAM" -> Color(0xFFE1306C)
        "FACEBOOK"  -> Color(0xFF1877F2)
        "TIKTOK"    -> Color(0xFF010101)
        else -> BizgrowColors.Primary
    }

    BizCard {
        Row(verticalAlignment = Alignment.Top) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = platformColor.copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = post.platform.uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = platformColor,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    StatusBadge(post.status.uppercase())
                }
                Text(post.caption, style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray800, maxLines = 3)
                if (post.imageUrl?.isNotBlank() == true) {
                    Text("📎 Ada lampiran", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray500)
                }
                Text("📅 ${post.scheduledAt}", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray500)
            }
            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = null, tint = BizgrowColors.Gray700)
                }
                DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                    DropdownMenuItem(
                        text = { Text("Edit") },
                        leadingIcon = { Icon(Icons.Default.Edit, null) },
                        onClick = { showMenu = false; onEdit(post) }
                    )
                    DropdownMenuItem(
                        text = { Text("Hapus", color = BizgrowColors.Danger) },
                        leadingIcon = { Icon(Icons.Default.Delete, null, tint = BizgrowColors.Danger) },
                        onClick = { showMenu = false; onDelete(post) }
                    )
                }
            }
        }
    }
}

@Composable
fun PlatformChip(label: String, selected: Boolean, gradient: List<Color>, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = if (selected) gradient.first() else BizgrowColors.White,
        contentColor = if (selected) Color.White else BizgrowColors.Gray700,
        border = if (!selected) androidx.compose.foundation.BorderStroke(1.dp, BizgrowColors.Gray200) else null,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            fontSize = 13.sp
        )
    }
}
