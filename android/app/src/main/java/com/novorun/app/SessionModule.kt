package com.novorun.app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class SessionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "SessionModule"
    }
    
    @ReactMethod
    fun saveLoginSession(userId: String, token: String, email: String, promise: Promise) {
        try {
            val sessionManager = SessionManager.getInstance(reactApplicationContext)
            sessionManager.saveLoginSession(userId, token, email)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SESSION_SAVE_ERROR", "Failed to save session", e)
        }
    }
    
    @ReactMethod
    fun isSessionValid(promise: Promise) {
        try {
            val sessionManager = SessionManager.getInstance(reactApplicationContext)
            val isValid = sessionManager.isSessionValid()
            promise.resolve(isValid)
        } catch (e: Exception) {
            promise.reject("SESSION_CHECK_ERROR", "Failed to check session", e)
        }
    }
    
    @ReactMethod
    fun clearSession(promise: Promise) {
        try {
            val sessionManager = SessionManager.getInstance(reactApplicationContext)
            sessionManager.clearSession()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SESSION_CLEAR_ERROR", "Failed to clear session", e)
        }
    }
    
    @ReactMethod
    fun getSessionInfo(promise: Promise) {
        try {
            val sessionManager = SessionManager.getInstance(reactApplicationContext)
            val sessionInfo = mapOf(
                "isLoggedIn" to sessionManager.isUserLoggedIn(),
                "isValid" to sessionManager.isSessionValid(),
                "userId" to sessionManager.getUserId(),
                "token" to sessionManager.getUserToken(),
                "email" to sessionManager.getEmail(),
                "sessionAgeInDays" to sessionManager.getSessionAgeInDays()
            )
            promise.resolve(sessionInfo)
        } catch (e: Exception) {
            promise.reject("SESSION_INFO_ERROR", "Failed to get session info", e)
        }
    }
}
