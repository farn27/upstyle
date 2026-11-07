package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizMotion
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import com.upstyle.bizgrow.ui.theme.LocalBizPalette

/** 0..4 — panjang, huruf besar/kecil, angka, simbol. */
private fun kekuatanPassword(p: String): Int {
    if (p.isEmpty()) return 0
    var skor = 0
    if (p.length >= 8) skor++
    if (p.length >= 12) skor++
    if (p.any { it.isUpperCase() } && p.any { it.isLowerCase() }) skor++
    if (p.any { it.isDigit() } && p.any { !it.isLetterOrDigit() }) skor++
    return skor.coerceIn(1, 4)
}

@Composable
fun RegisterScreen(viewModel: AppViewModel) {
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var konfirmasi by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    val focus = LocalFocusManager.current

    // Aturan sama dengan server (/api/auth/register)
    val usernameErr = when {
        username.isEmpty() -> null
        username.trim().length < 3 -> "Minimal 3 karakter"
        !Regex("^[a-zA-Z0-9_]+$").matches(username.trim()) -> "Hanya huruf, angka, dan underscore"
        else -> null
    }
    val emailErr = if (email.isNotEmpty() && !Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$").matches(email.trim())) "Format email belum benar" else null
    val passwordErr = if (password.isNotEmpty() && password.length < 8) "Minimal 8 karakter" else null
    val konfirmasiErr = if (konfirmasi.isNotEmpty() && konfirmasi != password) "Password tidak sama" else null
    val valid = username.isNotBlank() && email.isNotBlank() && password.isNotEmpty() && konfirmasi.isNotEmpty() &&
        usernameErr == null && emailErr == null && passwordErr == null && konfirmasiErr == null

    fun daftar() {
        if (!valid || uiState.isLoading) return
        focus.clearFocus()
        errorMsg = null
        viewModel.register(username.trim(), email.trim(), password) { ok, msg ->
            if (ok) viewModel.navigateBack() else errorMsg = pesanRamah(msg) ?: "Pendaftaran gagal"
        }
    }

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding()) {
            Box {
                AuthHero(title = "Buat akun", subtitle = "Gratis. Siap pakai dalam 1 menit.", height = 250.dp)
                IconButton(
                    onClick = { viewModel.navigateBack() },
                    modifier = Modifier.statusBarsPadding().padding(8.dp)
                ) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Kembali", tint = Color.White) }
            }

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
                BizTextField(username, { username = it; errorMsg = null }, "Nama pengguna", leadingIcon = Icons.Rounded.PersonOutline,
                    isError = usernameErr != null, supportingText = usernameErr)
                Spacer(Modifier.height(10.dp))
                BizTextField(email, { email = it; errorMsg = null }, "Email", leadingIcon = Icons.Rounded.MailOutline,
                    keyboardType = KeyboardType.Email, isError = emailErr != null, supportingText = emailErr)
                Spacer(Modifier.height(10.dp))
                BizTextField(password, { password = it; errorMsg = null }, "Password", leadingIcon = Icons.Rounded.Lock,
                    isPassword = true, isError = passwordErr != null, supportingText = passwordErr)
                KekuatanBar(kekuatanPassword(password), visible = password.isNotEmpty())
                Spacer(Modifier.height(10.dp))
                BizTextField(konfirmasi, { konfirmasi = it; errorMsg = null }, "Konfirmasi password", leadingIcon = Icons.Rounded.Lock,
                    isPassword = true, imeAction = ImeAction.Done, onImeAction = { daftar() },
                    isError = konfirmasiErr != null, supportingText = konfirmasiErr)

                AuthErrorBanner(errorMsg)
                Spacer(Modifier.height(18.dp))
                BizButton("Daftar", { daftar() }, loading = uiState.isLoading, enabled = valid, icon = Icons.Rounded.RocketLaunch, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(12.dp))
                Text(
                    "Dengan mendaftar, kamu menyetujui syarat & kebijakan privasi Bizgrow.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Row(Modifier.fillMaxWidth().padding(bottom = 32.dp), horizontalArrangement = Arrangement.Center) {
                Text("Sudah punya akun? ", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    "Masuk",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { viewModel.navigateBack() }.padding(horizontal = 4.dp)
                )
            }
        }
    }
}

@Composable
private fun KekuatanBar(skor: Int, visible: Boolean) {
    if (!visible) return
    val (label, warna) = when (skor) {
        1 -> "Lemah" to BizgrowColors.Danger
        2 -> "Cukup" to BizgrowColors.Warning
        3 -> "Kuat" to BizgrowColors.Success
        else -> "Sangat kuat" to BizgrowColors.Success
    }
    val w by animateColorAsState(warna, BizMotion.fast(), label = "w")
    Row(Modifier.fillMaxWidth().padding(top = 6.dp, start = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        repeat(4) { i ->
            val isi by animateFloatAsState(if (i < skor) 1f else 0f, BizMotion.medium(), label = "isi$i")
            Box(
                Modifier.weight(1f).height(5.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Box(Modifier.fillMaxHeight().fillMaxWidth(isi).clip(CircleShape).background(w))
            }
            if (i < 3) Spacer(Modifier.width(5.dp))
        }
        Spacer(Modifier.width(10.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = w)
    }
}
