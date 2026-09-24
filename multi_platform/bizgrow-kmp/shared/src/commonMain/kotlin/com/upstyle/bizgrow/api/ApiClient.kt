package com.upstyle.bizgrow.api

import com.upstyle.bizgrow.data.SessionRepository
import io.github.aakira.napier.Napier
import io.ktor.client.*
import io.ktor.client.plugins.*
import io.ktor.client.request.header
import io.ktor.client.plugins.auth.*
import io.ktor.client.plugins.auth.providers.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

/**
 * Creates a new Ktor HTTP client configured with:
 * - Bearer token from [session] on every request
 * - 401 detection via [onUnauthorized] callback so callers can react (e.g. redirect to login)
 *
 * Call this function after login to get a client with the latest token.
 */
fun createHttpClient(
    session: SessionRepository,
    onUnauthorized: (() -> Unit)? = null
): HttpClient {
    return HttpClient {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
                coerceInputValues = true
            })
        }

        install(Logging) {
            logger = object : Logger {
                override fun log(message: String) = Napier.d(message, tag = "Ktor")
            }
            level = LogLevel.BODY
        }

        install(DefaultRequest) {
            val baseUrl = session.getServerUrl().trimEnd('/')
            url(baseUrl)
            header(HttpHeaders.ContentType, ContentType.Application.Json)
            // Token dibaca ulang setiap kali DefaultRequest dieksekusi — memastikan
            // token terbaru selalu dikirim setelah client di-recreate post-login.
            val token = session.getToken()
            if (!token.isNullOrEmpty()) {
                header(HttpHeaders.Authorization, "Bearer $token")
            }
        }

        install(HttpTimeout) {
            requestTimeoutMillis = 30_000
            connectTimeoutMillis = 15_000
            socketTimeoutMillis = 30_000
        }

        // Deteksi HTTP 401 dan panggil callback agar AppViewModel bisa redirect ke Login
        HttpResponseValidator {
            validateResponse { response ->
                if (response.status == HttpStatusCode.Unauthorized) {
                    Napier.w("HTTP 401 detected — triggering session invalidation", tag = "ApiClient")
                    onUnauthorized?.invoke()
                }
            }
        }
    }
}
