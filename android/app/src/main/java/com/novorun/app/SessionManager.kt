package com.novorun.app

import android.content.Context
import android.content.SharedPreferences
import java.util.concurrent.TimeUnit

class SessionManager private constructor(context: Context) {
    
    private val sharedPreferences: SharedPreferences = 
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    
    companion object {
        private const val PREF_NAME = "NovoSessionPrefs"
        private const val KEY_LOGIN_TIME = "loginTime"
        private const val KEY_USER_ID = "userId"
        private const val KEY_USER_TOKEN = "userToken"
        private const val KEY_EMAIL = "email"
        private const val TOKEN_DURATION_DAYS = 30L
        
        @Volatile
        private var INSTANCE: SessionManager? = null
        
        fun getInstance(context: Context): SessionManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: SessionManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
    
    fun saveLoginSession(userId: String, token: String, email: String) {
        val currentTime = System.currentTimeMillis()
        sharedPreferences.edit().apply {
            putLong(KEY_LOGIN_TIME, currentTime)
            putString(KEY_USER_ID, userId)
            putString(KEY_USER_TOKEN, token)
            putString(KEY_EMAIL, email)
            apply()
        }
    }
    
    fun isSessionValid(): Boolean {
        val loginTime = sharedPreferences.getLong(KEY_LOGIN_TIME, 0)
        if (loginTime == 0L) return false
        
        val currentTime = System.currentTimeMillis()
        val sessionAge = currentTime - loginTime
        val maxSessionAge = TimeUnit.DAYS.toMillis(TOKEN_DURATION_DAYS)
        
        return sessionAge < maxSessionAge
    }
    
    fun isUserLoggedIn(): Boolean {
        val userId = sharedPreferences.getString(KEY_USER_ID, null)
        val token = sharedPreferences.getString(KEY_USER_TOKEN, null)
        return !userId.isNullOrEmpty() && !token.isNullOrEmpty()
    }
    
    fun getUserToken(): String? {
        return sharedPreferences.getString(KEY_USER_TOKEN, null)
    }
    
    fun getUserId(): String? {
        return sharedPreferences.getString(KEY_USER_ID, null)
    }
    
    fun getEmail(): String? {
        return sharedPreferences.getString(KEY_EMAIL, null)
    }
    
    fun clearSession() {
        sharedPreferences.edit().clear().apply()
    }
    
    fun isSessionExpired(): Boolean {
        return isUserLoggedIn() && !isSessionValid()
    }
    
    fun getSessionAgeInDays(): Long {
        val loginTime = sharedPreferences.getLong(KEY_LOGIN_TIME, 0)
        if (loginTime == 0L) return 0
        
        val currentTime = System.currentTimeMillis()
        val sessionAge = currentTime - loginTime
        return TimeUnit.MILLISECONDS.toDays(sessionAge)
    }
}
