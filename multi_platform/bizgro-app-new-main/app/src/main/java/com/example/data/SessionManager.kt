package com.example.data

object SessionManager {
    private var sessionToken: String? = null
    private var loggedInUserRole: String = ""
    private var loggedInUserEmail: String = ""

    fun saveSession(token: String, role: String, email: String) {
        sessionToken = token
        loggedInUserRole = role
        loggedInUserEmail = email
    }

    fun clearSession() {
        sessionToken = null
        loggedInUserRole = ""
        loggedInUserEmail = ""
    }

    fun getToken(): String? = sessionToken
    fun getRole(): String = loggedInUserRole
    fun getEmail(): String = loggedInUserEmail
}
