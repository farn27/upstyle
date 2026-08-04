package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.LandingPage
import com.upstyle.bizgrow.data.LandingPageTemplate
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LandingPageScreen(viewModel: AppViewModel) {
    val state by viewModel.landingPageState.collectAsStateWithLifecycle()
    var showForm by remember { mutableStateOf(false) }
    var editingPage by remember { mutableStateOf<LandingPage?>(null) }
    var showTemplates by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadLandingPages()
        viewModel.loadLandingPageTemplates()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Landing Pages") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                ),
                actions = {
                    IconButton(onClick = { showTemplates = true }) {
                        Icon(Icons.Default.ViewCarousel, "Templates", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                }
            )
        },
        bottomBar = { BottomNavBar(viewModel, AppViewModel.Screen.LandingPageScreen) },
        floatingActionButton = {
            FloatingActionButton(onClick = { editingPage = null; showForm = true }) {
                Icon(Icons.Default.Add, "Create Landing Page")
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (state.pages.isEmpty()) {
                        item {
                            Text(
                                "Belum ada landing page. Klik + untuk membuat.",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    } else {
                        items(state.pages) { page ->
                            LandingPageCard(
                                page = page,
                                onEdit = { editingPage = page; showForm = true },
                                onDelete = { viewModel.deleteLandingPage(page.id) },
                                onToggle = { viewModel.toggleLandingPageActive(page.id, !page.isActive) }
                            )
                        }
                    }
                }
            }
        }

        if (showForm) {
            LandingPageFormDialog(
                page = editingPage,
                onDismiss = { showForm = false; editingPage = null },
                onCreate = { page -> viewModel.createLandingPage(page); showForm = false },
                onUpdate = { page -> viewModel.updateLandingPage(page); showForm = false }
            )
        }

        if (showTemplates) {
            TemplatePickerDialog(
                templates = state.templates,
                onDismiss = { showTemplates = false },
                onPick = { template ->
                    val newPage = LandingPage(
                        unitId = 0,
                        title = template.name,
                        pageSlug = template.key,
                        template = template.key,
                        contentJson = """{"sections":"${template.sections.joinToString(",")}"}""",
                        isActive = false
                    )
                    viewModel.createLandingPage(newPage)
                    showTemplates = false
                }
            )
        }
    }
}

@Composable
fun LandingPageCard(
    page: LandingPage,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onToggle: () -> Unit
) {
    var showDeleteConfirm by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = page.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "/${page.pageSlug}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Switch(
                        checked = page.isActive,
                        onCheckedChange = { onToggle() }
                    )
                    IconButton(onClick = onEdit) {
                        Icon(Icons.Default.Edit, "Edit", tint = MaterialTheme.colorScheme.primary)
                    }
                    IconButton(onClick = { showDeleteConfirm = true }) {
                        Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
            if (page.template.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = page.template,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Hapus Landing Page?") },
            text = { Text("Landing page \"${page.title}\" akan dihapus permanen.") },
            confirmButton = {
                Button(onClick = { onDelete(); showDeleteConfirm = false }, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)) {
                    Text("Hapus")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) { Text("Batal") }
            }
        )
    }
}

@Composable
fun LandingPageFormDialog(
    page: LandingPage?,
    onDismiss: () -> Unit,
    onCreate: (LandingPage) -> Unit,
    onUpdate: (LandingPage) -> Unit
) {
    var title by remember { mutableStateOf(page?.title ?: "") }
    var slug by remember { mutableStateOf(page?.pageSlug ?: "") }
    var template by remember { mutableStateOf(page?.template ?: "leadgen") }
    var content by remember { mutableStateOf(page?.contentJson ?: "{}") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (page == null) "Buat Landing Page" else "Edit Landing Page") },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("Judul") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                item {
                    OutlinedTextField(
                        value = slug,
                        onValueChange = { slug = it.lowercase().replace(" ", "-") },
                        label = { Text("Slug (URL)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                item {
                    OutlinedTextField(
                        value = template,
                        onValueChange = { template = it },
                        label = { Text("Template") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                item {
                    OutlinedTextField(
                        value = content,
                        onValueChange = { content = it },
                        label = { Text("Content") },
                        modifier = Modifier.fillMaxWidth().height(120.dp),
                        maxLines = 5
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val newPage = if (page == null) {
                        LandingPage(unitId = 0, title = title, pageSlug = slug, template = template, contentJson = content, isActive = false)
                    } else {
                        page.copy(title = title, pageSlug = slug, template = template, contentJson = content)
                    }
                    if (page == null) onCreate(newPage) else onUpdate(newPage)
                }
            ) {
                Text(if (page == null) "Buat" else "Simpan")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Batal") }
        }
    )
}

@Composable
fun TemplatePickerDialog(
    templates: List<LandingPageTemplate>,
    onDismiss: () -> Unit,
    onPick: (LandingPageTemplate) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Pilih Template") },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(templates) { template ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { onPick(template) },
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(template.name, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(template.description, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Tutup") }
        }
    )
}
