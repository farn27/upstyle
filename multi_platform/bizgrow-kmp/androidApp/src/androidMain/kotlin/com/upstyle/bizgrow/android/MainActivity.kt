package com.upstyle.bizgrow.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.lifecycleScope
import com.upstyle.bizgrow.ui.App
import com.upstyle.bizgrow.ui.AppViewModel
import kotlinx.coroutines.launch
import org.koin.androidx.viewmodel.ext.android.viewModel

class MainActivity : ComponentActivity() {

    private val viewModel: AppViewModel by viewModel()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            App(
                viewModel = viewModel,
                onGoogleSignIn = { triggerGoogleSignIn() }
            )
        }
    }

    private fun triggerGoogleSignIn() {
        lifecycleScope.launch {
            GoogleSignInHelper.signIn(this@MainActivity) { token, error ->
                if (token != null) {
                    viewModel.loginWithGoogle(token)
                } else {
                    // Tampilkan error — viewModel akan set error state
                    viewModel.loginWithGoogle("") // trigger error state
                }
            }
        }
    }
}
