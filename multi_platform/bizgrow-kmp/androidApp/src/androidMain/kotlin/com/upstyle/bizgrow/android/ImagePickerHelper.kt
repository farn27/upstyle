package com.upstyle.bizgrow.android

import android.content.Context
import android.net.Uri
import android.util.Base64
import java.io.ByteArrayOutputStream

object ImagePickerHelper {
    /**
     * Converts a content URI to a base64 string suitable for uploading.
     * Returns "data:image/jpeg;base64,..." string.
     */
    fun uriToBase64(context: Context, uri: Uri): String? {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri) ?: return null
            val bytes = inputStream.readBytes()
            inputStream.close()
            val encoded = Base64.encodeToString(bytes, Base64.NO_WRAP)
            "data:image/jpeg;base64,$encoded"
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Get file size in KB from URI
     */
    fun getFileSizeKb(context: Context, uri: Uri): Long {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri) ?: return 0
            val size = inputStream.available().toLong() / 1024
            inputStream.close()
            size
        } catch (e: Exception) {
            0
        }
    }
}
