package com.upstyle.bizgrow.di

import com.russhwolf.settings.Settings
import com.upstyle.bizgrow.api.UpstyleApi
import com.upstyle.bizgrow.api.createHttpClient
import com.upstyle.bizgrow.data.SessionRepository
import com.upstyle.bizgrow.ui.AppViewModel
import org.koin.dsl.module

val sharedModule = module {
    single { Settings() }
    single { SessionRepository(get()) }
    single { createHttpClient(get()) }
    single { UpstyleApi(get()) }
    single { AppViewModel(get(), get()) }
}
