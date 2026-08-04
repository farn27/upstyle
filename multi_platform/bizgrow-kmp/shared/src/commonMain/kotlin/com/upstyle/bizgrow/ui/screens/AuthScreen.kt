package com.upstyle.bizgrow.ui.screens

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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@Composable
fun AuthScreen(viewModel: AppViewModel) {
    var isRegister by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var successMsg by remember { mutableStateOf<String?>(null) }
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BizgrowColors.Background)
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .verticalScroll(rememberScrollState())
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Spacer(Modifier.weight(1f))

        Surface(color = BizgrowColors.PrimaryLight, shape = RoundedCornerShape(24.dp), modifier = Modifier.size(80.dp)) {
            Box(contentAlignment = Alignment.Center) {
                Icon(Icons.Default.BusinessCenter, null, Modifier.size(40.dp), tint = BizgrowColors.Primary)
            }
        }
        
        Spacer(Modifier.height(24.dp))

        Text("BizGrow", fontSize = 32.sp, fontWeight = FontWeight.Black, color = BizgrowColors.Gray950)
        Text("Platform Bisnis UMKM Indonesia", fontSize = 14.sp, color = BizgrowColors.Gray500, fontWeight = FontWeight.Medium)

        Spacer(Modifier.height(32.dp))

        Card(
            modifier = Modifier.fillMaxWidth(), 
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = BizgrowColors.White),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                    TabRow(
                        selectedTabIndex = if (isRegister) 1 else 0,
                        containerColor = BizgrowColors.White,
                        contentColor = BizgrowColors.Primary,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Tab(
                            selected = !isRegister, 
                            onClick = { isRegister = false; errorMsg = null; successMsg = null },
                            text = { Text("Masuk", fontWeight = FontWeight.Bold) }
                        )
                        Tab(
                            selected = isRegister, 
                            onClick = { isRegister = true; errorMsg = null; successMsg = null },
                            text = { Text("Daftar", fontWeight = FontWeight.Bold) }
                        )
                    }
                }
                
                Spacer(Modifier.height(8.dp))

                if (isRegister) {
                    OutlinedTextField(
                        value = username, onValueChange = { username = it; errorMsg = null },
                        placeholder = { Text("Nama Lengkap", color = BizgrowColors.Gray400) },
                        leadingIcon = { Icon(Icons.Default.Person, null, tint = BizgrowColors.Gray400) },
                        modifier = Modifier.fillMaxWidth(), 
                        shape = RoundedCornerShape(20.dp), singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BizgrowColors.Primary,
                            unfocusedBorderColor = BizgrowColors.Gray200
                        )
                    )
                }
                OutlinedTextField(
                    value = email, onValueChange = { email = it; errorMsg = null },
                    placeholder = { Text("Email", color = BizgrowColors.Gray400) }, 
                    leadingIcon = { Icon(Icons.Default.Email, null, tint = BizgrowColors.Gray400) },
                    modifier = Modifier.fillMaxWidth(), 
                    shape = RoundedCornerShape(20.dp), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BizgrowColors.Primary,
                        unfocusedBorderColor = BizgrowColors.Gray200
                    )
                )
                OutlinedTextField(
                    value = password, onValueChange = { password = it; errorMsg = null },
                    placeholder = { Text("Password", color = BizgrowColors.Gray400) }, 
                    leadingIcon = { Icon(Icons.Default.Lock, null, tint = BizgrowColors.Gray400) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff, null, tint = BizgrowColors.Gray400)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(), 
                    shape = RoundedCornerShape(20.dp), singleLine = true,
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BizgrowColors.Primary,
                        unfocusedBorderColor = BizgrowColors.Gray200
                    )
                )

                if (errorMsg != null || uiState.error != null) {
                    Surface(color = BizgrowColors.DangerLight, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(errorMsg ?: uiState.error ?: "", Modifier.padding(12.dp), color = BizgrowColors.DangerDark, fontSize = 13.sp)
                    }
                }
                successMsg?.let {
                    Surface(color = BizgrowColors.SuccessLight, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(it, Modifier.padding(12.dp), color = BizgrowColors.Success, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(Modifier.height(8.dp))

                Button(
                    onClick = {
                        errorMsg = null; successMsg = null
                        if (isRegister) {
                            if (username.isBlank() || email.isBlank() || password.isBlank()) { errorMsg = "Semua field wajib diisi"; return@Button }
                            viewModel.register(username, email, password) { ok, msg ->
                                if (ok) { successMsg = "Registrasi berhasil! Silakan masuk."; isRegister = false; password = "" }
                                else errorMsg = msg ?: "Registrasi gagal"
                            }
                        } else {
                            if (email.isBlank() || password.isBlank()) { errorMsg = "Email dan password wajib diisi"; return@Button }
                            viewModel.login(email, password) { ok, msg -> if (!ok) errorMsg = msg ?: "Login gagal" }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary),
                    enabled = !uiState.isLoading
                ) {
                    if (uiState.isLoading) CircularProgressIndicator(Modifier.size(20.dp), color = BizgrowColors.White, strokeWidth = 2.dp)
                    else Text(if (isRegister) "Daftar Akun" else "Masuk", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
        }
        
        Spacer(Modifier.weight(1f))
    }
}
