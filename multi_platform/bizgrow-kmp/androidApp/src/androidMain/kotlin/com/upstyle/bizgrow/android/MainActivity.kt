package com.upstyle.bizgrow.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.lifecycleScope
import com.upstyle.bizgrow.ui.App
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import org.koin.androidx.viewmodel.ext.android.viewModel

class MainActivity : ComponentActivity() {

    private val viewModel: AppViewModel by viewModel()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Handle hardware/gesture back button
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val stack = viewModel.screenStack
                // If more than 1 screen in stack, go back
                if (stack.size > 1) {
                    viewModel.navigateBack()
                } else {
                    // At root — let the system handle (minimize/exit)
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    isEnabled = true
                }
            }
        })

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
                    viewModel.loginWithGoogle("")
                }
            }
        }
    }
}
