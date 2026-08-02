package com.upstyle.bizgrow.ui.screens

import androidx.compose.runtime.Composable

@Composable
actual fun rememberImagePickerLauncher(onImageSelected: (String?) -> Unit): () -> Unit {
    // iOS: stub — will implement native UIImagePickerController in later phase
    return { onImageSelected(null) }
}
