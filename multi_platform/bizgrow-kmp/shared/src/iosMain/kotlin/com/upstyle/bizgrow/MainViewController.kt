package com.upstyle.bizgrow

import androidx.compose.ui.window.ComposeUIViewController
import com.upstyle.bizgrow.di.sharedModule
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.BizgrowApp
import org.koin.compose.koinInject
import org.koin.core.context.startKoin
import io.github.aakira.napier.DebugAntilog
import io.github.aakira.napier.Napier

fun initKoin() {
    Napier.base(DebugAntilog())
    startKoin {
        modules(sharedModule)
    }
}

fun MainViewController() = ComposeUIViewController(
    configure = { initKoin() }
) {
    val viewModel = koinInject<AppViewModel>()
    BizgrowApp(viewModel)
}
