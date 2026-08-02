package com.upstyle.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.ui.MainViewModel

@Composable
fun AuthScreen(viewModel: MainViewModel) {
    var isRegister by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var successMsg by remember { mutableStateOf<String?>(null) }

    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Spacer(Modifier.height(40.dp))

        // Logo
        Surface(
            color = MaterialTheme.colorScheme.primary,
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.size(72.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(Icons.Default.BusinessCenter, null, Modifier.size(36.dp),
                    tint = MaterialTheme.colorScheme.onPrimary)
            }
        }

        Text("Bizgrow", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
        Text("Platform Bisnis UMKM Indonesia",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold
        )

        Spacer(Modifier.height(8.dp))

        // Tab Login / Register
        TabRow(selectedTabIndex = if (isRegister) 1 else 0) {
            Tab(selected = !isRegister, onClick = { isRegister = false; errorMsg = null }) {
                Text("Masuk", modifier = Modifier.padding(vertical = 12.dp), fontWeight = FontWeight.Bold)
            }
            Tab(selected = isRegister, onClick = { isRegister = true; errorMsg = null }) {
                Text("Daftar", modifier = Modifier.padding(vertical = 12.dp), fontWeight = FontWeight.Bold)
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (isRegister) {
                    OutlinedTextField(
                        value = username, onValueChange = { username = it; errorMsg = null },
                        label = { Text("Username") },
                        leadingIcon = { Icon(Icons.Default.Person, null) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                }

                OutlinedTextField(
                    value = email, onValueChange = { email = it; errorMsg = null },
                    label = { Text("Email") },
                    leadingIcon = { Icon(Icons.Default.Email, null) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                )

                OutlinedTextField(
                    value = password, onValueChange = { password = it; errorMsg = null },
                    label = { Text("Password") },
                    leadingIcon = { Icon(Icons.Default.Lock, null) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff, null)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                )

                errorMsg?.let {
                    Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(8.dp)) {
                        Text(it, modifier = Modifier.padding(12.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            style = MaterialTheme.typography.bodySmall)
                    }
                }

                successMsg?.let {
                    Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(8.dp)) {
                        Text(it, modifier = Modifier.padding(12.dp),
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            style = MaterialTheme.typography.bodySmall)
                    }
                }

                Button(
                    onClick = {
                        errorMsg = null
                        if (isRegister) {
                            if (username.isBlank() || email.isBlank() || password.isBlank()) {
                                errorMsg = "Semua field wajib diisi"
                                return@Button
                            }
                            viewModel.register(username, email, password) { ok, msg ->
                                if (ok) {
                                    successMsg = "Registrasi berhasil! Silakan masuk."
                                    isRegister = false
                                } else errorMsg = msg ?: "Registrasi gagal"
                            }
                        } else {
                            if (email.isBlank() || password.isBlank()) {
                                errorMsg = "Email dan password wajib diisi"
                                return@Button
                            }
                            viewModel.login(email, password) { ok, msg ->
                                if (!ok) errorMsg = msg ?: "Login gagal"
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    enabled = !uiState.isLoading
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                    } else {
                        Text(if (isRegister) "Daftar Akun" else "Masuk", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
