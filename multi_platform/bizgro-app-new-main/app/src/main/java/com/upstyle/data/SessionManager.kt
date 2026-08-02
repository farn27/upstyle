package com.upstyle.data

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

/**
 * Manages user session token & info using SharedPreferences.
 * Call SessionManager.init(context) from Application or MainActivity.
 */
object SessionManager {

    private const val PREFS_NAME = "upstyle_session"
    private const val KEY_TOKEN = "token"
    private const val KEY_ROLE = "role"
    private const val KEY_EMAIL = "email"
    private const val KEY_USERNAME = "username"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_ACTIVE_UNIT_ID = "active_unit_id"
    private const val KEY_ACTIVE_UNIT_NAME = "active_unit_name"
    private const val KEY_ACTIVE_UNIT_SLUG = "active_unit_slug"
    private const val KEY_SERVER_URL = "server_url"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun saveSession(token: String, role: String, email: String, username: String = "", userId: Int = 0) {
        prefs.edit {
            putString(KEY_TOKEN, token)
            putString(KEY_ROLE, role)
            putString(KEY_EMAIL, email)
            putString(KEY_USERNAME, username)
            putInt(KEY_USER_ID, userId)
        }
    }

    fun clearSession() {
        prefs.edit {
            remove(KEY_TOKEN)
            remove(KEY_ROLE)
            remove(KEY_EMAIL)
            remove(KEY_USERNAME)
            remove(KEY_USER_ID)
            remove(KEY_ACTIVE_UNIT_ID)
            remove(KEY_ACTIVE_UNIT_NAME)
            remove(KEY_ACTIVE_UNIT_SLUG)
        }
    }

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)
    fun getRole(): String = prefs.getString(KEY_ROLE, "user") ?: "user"
    fun getEmail(): String = prefs.getString(KEY_EMAIL, "") ?: ""
    fun getUsername(): String = prefs.getString(KEY_USERNAME, "") ?: ""
    fun getUserId(): Int = prefs.getInt(KEY_USER_ID, 0)
    fun isLoggedIn(): Boolean = !getToken().isNullOrEmpty()

    fun setActiveUnit(id: Int, name: String, slug: String) {
        prefs.edit {
            putInt(KEY_ACTIVE_UNIT_ID, id)
            putString(KEY_ACTIVE_UNIT_NAME, name)
            putString(KEY_ACTIVE_UNIT_SLUG, slug)
        }
    }

    fun getActiveUnitId(): Int = prefs.getInt(KEY_ACTIVE_UNIT_ID, 0)
    fun getActiveUnitName(): String = prefs.getString(KEY_ACTIVE_UNIT_NAME, "") ?: ""
    fun getActiveUnitSlug(): String = prefs.getString(KEY_ACTIVE_UNIT_SLUG, "") ?: ""

    // Server URL — configurable so user can point to their own server
    fun setServerUrl(url: String) = prefs.edit { putString(KEY_SERVER_URL, url.trimEnd('/')) }
    fun getServerUrl(): String = prefs.getString(KEY_SERVER_URL, "http://10.0.2.2:5173") ?: "http://10.0.2.2:5173"
    // Note: 10.0.2.2 = localhost from Android emulator
    // For physical device on same WiFi: use your computer's local IP e.g. http://192.168.1.x:5173
}
