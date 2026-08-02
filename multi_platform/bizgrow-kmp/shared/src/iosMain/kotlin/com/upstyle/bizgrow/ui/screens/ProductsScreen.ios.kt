package com.upstyle.bizgrow.ui.screens

import androidx.compose.runtime.Composable

@Composable
actual fun rememberImagePickerLauncher(onImageSelected: (String?) -> Unit): () -> Unit {
    // iOS: stub — UIImagePickerController integration planned for future phase
    return { onImageSelected(null) }
}
