package com.upstyle.bizgrow.android

import android.app.Application
import com.upstyle.bizgrow.di.sharedModule
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin

class BizgrowApp : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@BizgrowApp)
            modules(sharedModule)
        }
    }
}
