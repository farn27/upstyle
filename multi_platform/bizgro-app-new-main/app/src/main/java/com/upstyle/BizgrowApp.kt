package com.upstyle

import android.app.Application
import com.upstyle.data.SessionManager

/**
 * Application class — inisialisasi SessionManager di sini agar siap
 * sebelum Activity atau komponen apapun mengaksesnya.
 */
class BizgrowApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SessionManager.init(this)
    }
}
