package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.LocalBizPalette

@Composable
fun LoginScreen(
    viewModel: AppViewModel,
    onGoogleSignIn: (() -> Unit)? = null
) {
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var showServerDialog by remember { mutableStateOf(false) }
    var serverUrlInput by remember { mutableStateOf(viewModel.session.getServerUrl()) }
    val focus = LocalFocusManager.current

    val emailValid = email.isBlank() || Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$").matches(email.trim())
    val bisaMasuk = !uiState.isLoading && email.isNotBlank() && emailValid && password.isNotEmpty()

    fun masuk() {
        if (!bisaMasuk) return
        focus.clearFocus()
        errorMsg = null
        viewModel.login(email.trim(), password) { ok, msg ->
            if (!ok) errorMsg = pesanRamah(msg) ?: "Login gagal. Periksa email & password."
        }
    }

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding()) {
            AuthHero(title = "Selamat datang 👋", subtitle = "Kelola bisnismu dalam satu genggaman")

            Column(
                Modifier
                    .offset(y = (-28).dp)
                    .padding(horizontal = 16.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(28.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, LocalBizPalette.current.border, RoundedCornerShape(28.dp))
                    .padding(22.dp)
                    .enterAnimation()
            ) {
                Text("Masuk", style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onSurface)
                Text("Gunakan akun Bizgrow kamu", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(20.dp))

                BizTextField(
                    value = email,
                    onValueChange = { email = it; errorMsg = null },
                    label = "Email",
                    leadingIcon = Icons.Rounded.MailOutline,
                    keyboardType = KeyboardType.Email,
                    isError = !emailValid,
                    supportingText = if (!emailValid) "Format email belum benar" else null
                )
                Spacer(Modifier.height(12.dp))
                BizTextField(
                    value = password,
                    onValueChange = { password = it; errorMsg = null },
                    label = "Password",
                    leadingIcon = Icons.Rounded.Lock,
                    isPassword = true,
                    imeAction = ImeAction.Done,
                    onImeAction = { masuk() }
                )

                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    Text(
                        "Ubah server",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { showServerDialog = true }.padding(8.dp)
                    )
                }

                AuthErrorBanner(errorMsg)

                Spacer(Modifier.height(16.dp))
                BizButton(
                    text = "Masuk",
                    onClick = { masuk() },
                    loading = uiState.isLoading,
                    enabled = bisaMasuk,
                    icon = Icons.Rounded.Login,
                    modifier = Modifier.fillMaxWidth()
                )

                if (onGoogleSignIn != null) {
                    Row(Modifier.fillMaxWidth().padding(vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                        HorizontalDivider(Modifier.weight(1f), color = LocalBizPalette.current.border)
                        Text("atau", Modifier.padding(horizontal = 12.dp), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        HorizontalDivider(Modifier.weight(1f), color = LocalBizPalette.current.border)
                    }
                    BizOutlineButton(
                        text = "Lanjutkan dengan Google",
                        onClick = { if (!uiState.isLoading) onGoogleSignIn() },
                        icon = Icons.Rounded.AccountCircle,
                        tint = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            Row(
                Modifier.fillMaxWidth().padding(bottom = 32.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Belum punya akun? ", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    "Daftar gratis",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { viewModel.navigate(Screen.Register) }.padding(4.dp)
                )
            }
        }
    }

    if (showServerDialog) {
        AlertDialog(
            onDismissRequest = { showServerDialog = false },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            icon = { IconBadge(Icons.Rounded.Dns, MaterialTheme.colorScheme.primary) },
            title = { Text("Alamat server") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Ubah hanya jika diminta admin. Untuk server bawaan, biarkan seperti semula.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    BizTextField(serverUrlInput, { serverUrlInput = it }, label = "URL server", keyboardType = KeyboardType.Uri, imeAction = ImeAction.Done)
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.session.setServerUrl(serverUrlInput.trimEnd('/'))
                    showServerDialog = false
                }) { Text("Simpan") }
            },
            dismissButton = { TextButton(onClick = { showServerDialog = false }) { Text("Batal") } }
        )
    }
}
