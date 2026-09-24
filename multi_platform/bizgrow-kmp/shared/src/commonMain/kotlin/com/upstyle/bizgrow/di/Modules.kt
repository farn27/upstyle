package com.upstyle.bizgrow.di

import com.russhwolf.settings.Settings
import com.upstyle.bizgrow.api.UpstyleApi
import com.upstyle.bizgrow.api.createHttpClient
import com.upstyle.bizgrow.data.SessionRepository
import com.upstyle.bizgrow.cache.CacheManager
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.PosViewModel
import org.koin.dsl.module

val sharedModule = module {
    single { Settings() }
    single { SessionRepository(get()) }
    single { CacheManager(get()) }
    // AppViewModel membuat dan mengelola UpstyleApi-nya sendiri
    // agar bisa di-recreate dengan token terbaru setelah login
    single { AppViewModel(get(), get()) }
    // Task 8: PosViewModel as separate injectable ViewModel
    factory { PosViewModel(get()) { get<AppViewModel>().activeUnitId.value } }
}
