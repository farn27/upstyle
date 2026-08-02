package com.upstyle.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.upstyle.data.SessionManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val authInterceptor = Interceptor { chain ->
        val token = SessionManager.getToken()
        val req = chain.request().newBuilder().apply {
            if (!token.isNullOrEmpty()) {
                header("Authorization", "Bearer $token")
            }
            header("Accept", "application/json")
            header("Content-Type", "application/json")
        }.build()
        chain.proceed(req)
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private fun buildOkHttp() = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .build()

    /**
     * Build API service using the URL saved in SessionManager.
     * Always call this fresh — never cache since URL can change in settings.
     */
    fun build(): UpstyleApi {
        val baseUrl = SessionManager.getServerUrl().trimEnd('/') + "/"
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(buildOkHttp())
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(UpstyleApi::class.java)
    }

    // Convenience accessor — creates fresh instance each time (lightweight)
    val api: UpstyleApi get() = build()
}
