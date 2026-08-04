package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.data.*
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CrmContactsScreen(viewModel: AppViewModel) {
    val contacts by viewModel.crmContacts.collectAsState(initial = viewModel.crmContacts.value)
    var searchQuery by remember { mutableStateOf("") }
    var showAddContactSheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Kontak CRM") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                actions = {
                    IconButton(onClick = { /* Toggle search */ }) {
                        Icon(Icons.Default.Search, contentDescription = "Cari")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddContactSheet = true }) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Kontak")
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Cari Kontak") },
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) }
            )

            val filteredContacts = contacts.filter { 
                it.nama.contains(searchQuery, ignoreCase = true)
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filteredContacts) { contact ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { },
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = CircleShape,
                                modifier = Modifier.size(40.dp),
                                color = MaterialTheme.colorScheme.primaryContainer
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(contact.nama.firstOrNull()?.toString() ?: "", fontWeight = FontWeight.Bold)
                                }
                            }
                            Spacer(Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(contact.nama, fontWeight = FontWeight.Bold)
                                Text(contact.perusahaan, style = MaterialTheme.typography.bodyMedium)
                                Text(contact.telepon, style = MaterialTheme.typography.bodySmall)
                            }
                            SuggestionChip(onClick = {}, label = { Text(contact.stage) })
                        }
                    }
                }
            }
        }

        if (showAddContactSheet) {
            ModalBottomSheet(onDismissRequest = { showAddContactSheet = false }) {
                Column(Modifier.padding(16.dp)) {
                    Text("Tambah Kontak", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(value = "", onValueChange = {}, label = { Text("Nama") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(value = "", onValueChange = {}, label = { Text("Perusahaan") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(value = "", onValueChange = {}, label = { Text("Telepon") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { showAddContactSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Simpan") }
                    Spacer(Modifier.height(16.dp))
                }
            }
        }
    }
}
