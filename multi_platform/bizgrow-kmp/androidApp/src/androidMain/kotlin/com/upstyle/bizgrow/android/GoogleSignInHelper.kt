package com.upstyle.bizgrow.android

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

/**
 * Helper untuk Google Sign-In menggunakan Credential Manager API (Android 14+).
 * Fallback tersedia untuk Android lama via play-services-auth.
 *
 * Cara pakai:
 *   GoogleSignInHelper.signIn(context) { token, error ->
 *       if (token != null) viewModel.loginWithGoogle(token)
 *   }
 */
object GoogleSignInHelper {

    // Ganti dengan Web Client ID dari Google Cloud Console
    // Harus Web Client ID (bukan Android Client ID) karena backend verify token via Google API
    private const val WEB_CLIENT_ID = "366459470021-d3o320fjc08np62co6jp4b4lg23pe0bm.apps.googleusercontent.com"

    suspend fun signIn(context: Context, onResult: (token: String?, error: String?) -> Unit) {
        try {
            val credentialManager = CredentialManager.create(context)

            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false) // false = tampilkan semua akun Google di device
                .setServerClientId(WEB_CLIENT_ID)
                .setAutoSelectEnabled(false) // false = selalu tampilkan picker
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()

            val result: GetCredentialResponse = credentialManager.getCredential(
                request = request,
                context = context
            )

            val credential = result.credential
            val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
            val idToken = googleIdTokenCredential.idToken

            onResult(idToken, null)

        } catch (e: GetCredentialException) {
            onResult(null, "Google Sign-In dibatalkan atau gagal: ${e.message}")
        } catch (e: Exception) {
            onResult(null, "Error: ${e.message}")
        }
    }
}
