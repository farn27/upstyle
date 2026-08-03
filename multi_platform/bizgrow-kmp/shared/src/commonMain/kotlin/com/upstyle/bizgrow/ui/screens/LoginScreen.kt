package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.coroutines.delay

@Composable
fun LoginScreen(
    viewModel: AppViewModel,
    onGoogleSignIn: (() -> Unit)? = null
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var isVisible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        isVisible = true
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BizgrowColors.Background)
    ) {
        // Decorative background elements
        Box(modifier = Modifier
            .offset(x = (-50).dp, y = (-50).dp)
            .size(200.dp)
            .background(BizgrowColors.PrimaryLight.copy(alpha = 0.5f), shape = RoundedCornerShape(100.dp))
        )
        Box(modifier = Modifier
            .align(Alignment.TopEnd)
            .offset(x = 50.dp, y = 100.dp)
            .size(150.dp)
            .background(BizgrowColors.SecondaryContainer.copy(alpha = 0.4f), shape = RoundedCornerShape(75.dp))
        )

        AnimatedVisibility(
            visible = isVisible,
            enter = fadeIn(animationSpec = tween(800)) + slideInVertically(initialOffsetY = { 50 }, animationSpec = tween(800)),
            modifier = Modifier.align(Alignment.Center)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Logo & Tagline
                Text(
                    text = "Bizgrow",
                    color = BizgrowColors.PrimaryDark,
                    fontSize = 42.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = (-1.5).sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Platform Bisnis UMKM Indonesia",
                    color = BizgrowColors.Slate500,
                    fontSize = 15.sp,
                    textAlign = TextAlign.Center,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(48.dp))

                // Email field
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it; errorMsg = null },
                    placeholder = { Text("Email", color = BizgrowColors.Slate400) },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = BizgrowColors.Slate400) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BizgrowColors.Primary,
                        unfocusedBorderColor = BizgrowColors.Slate200,
                        focusedContainerColor = BizgrowColors.White,
                        unfocusedContainerColor = BizgrowColors.White,
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Password field
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it; errorMsg = null },
                    placeholder = { Text("Password", color = BizgrowColors.Slate400) },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = BizgrowColors.Slate400) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                contentDescription = null,
                                tint = BizgrowColors.Slate400
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BizgrowColors.Primary,
                        unfocusedBorderColor = BizgrowColors.Slate200,
                        focusedContainerColor = BizgrowColors.White,
                        unfocusedContainerColor = BizgrowColors.White,
                    )
                )

                // Error Msg
                if (errorMsg != null || uiState.error != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = errorMsg ?: uiState.error ?: "",
                        color = BizgrowColors.Danger,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Login Button
                Button(
                    onClick = {
                        errorMsg = null
                        viewModel.login(email.trim(), password) { ok, msg ->
                            if (!ok) errorMsg = msg ?: "Login gagal"
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = BizgrowColors.Primary,
                        contentColor = BizgrowColors.White
                    ),
                    enabled = !uiState.isLoading && email.isNotEmpty() && password.isNotEmpty()
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(color = BizgrowColors.White, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Masuk", fontSize = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp)
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Divider OR
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    HorizontalDivider(modifier = Modifier.weight(1f), color = BizgrowColors.Slate200)
                    Text(
                        text = " Atau ",
                        fontSize = 13.sp,
                        color = BizgrowColors.Slate400,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 8.dp)
                    )
                    HorizontalDivider(modifier = Modifier.weight(1f), color = BizgrowColors.Slate200)
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Biometric Manager instance
                val biometricManager = com.upstyle.bizgrow.device.rememberBiometricManager()
                
                // Google & Biometric Sign-In Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    OutlinedButton(
                        onClick = { onGoogleSignIn?.invoke() },
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp),
                        shape = RoundedCornerShape(20.dp),
                        enabled = !uiState.isLoading && onGoogleSignIn != null,
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = BizgrowColors.White,
                            contentColor = BizgrowColors.Slate800
                        ),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BizgrowColors.Slate200)
                    ) {
                        Text(
                            text = "G",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF4285F4)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Google",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    OutlinedButton(
                        onClick = {
                            biometricManager.authenticate(
                                title = "Login Biometrik",
                                subtitle = "Gunakan sidik jari atau wajah Anda",
                                onSuccess = {
                                    // Normally we would exchange a secure token stored in Keystore, 
                                    // but for mockup we will auto-login a demo account or use saved credentials.
                                    // If we had stored credentials:
                                    // viewModel.login(savedEmail, savedPassword)
                                    // For now, let's just show an error that credentials must be saved first
                                    errorMsg = "Login Biometrik berhasil. (Namun fitur auto-fill kredensial belum tersedia)"
                                },
                                onError = { err -> errorMsg = err }
                            )
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp),
                        shape = RoundedCornerShape(20.dp),
                        enabled = !uiState.isLoading,
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = BizgrowColors.White,
                            contentColor = BizgrowColors.Slate800
                        ),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BizgrowColors.Slate200)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Biometrik",
                            tint = BizgrowColors.Primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Biometrik",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Register link
                Row(
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Belum punya akun? ",
                        color = BizgrowColors.Slate500,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "Daftar sekarang",
                        color = BizgrowColors.Primary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        modifier = Modifier.clickable { viewModel.navigate(Screen.Register) }
                    )
                }
            }
        }
    }
}
