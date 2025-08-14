package com.novorun.app

import android.app.AlertDialog
import android.content.Context
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class SessionExpiryHandler private constructor(private val context: Context) {
    
    companion object {
        @Volatile
        private var INSTANCE: SessionExpiryHandler? = null
        
        fun getInstance(context: Context): SessionExpiryHandler {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: SessionExpiryHandler(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
    
    fun handleSessionExpiry() {
        Handler(Looper.getMainLooper()).post {
            showSessionExpiredDialog()
        }
    }
    
    private fun showSessionExpiredDialog() {
        try {
            // Try to get current activity context
            val activityContext = getCurrentActivityContext() ?: return
            
            AlertDialog.Builder(activityContext)
                .setTitle("Session Expired")
                .setMessage("Your session has expired. Please login again to continue.")
                .setCancelable(false)
                .setPositiveButton("Login Again") { dialog, _ ->
                    dialog.dismiss()
                    clearSessionAndNavigate()
                }
                .show()
        } catch (e: Exception) {
            // Fallback: just clear session and send event to React Native
            clearSessionAndNavigate()
        }
    }
    
    private fun clearSessionAndNavigate() {
        // Clear native session
        val sessionManager = SessionManager.getInstance(context)
        sessionManager.clearSession()
        
        // Send event to React Native to handle navigation
        sendSessionExpiredEvent()
    }
    
    private fun sendSessionExpiredEvent() {
        try {
            val reactContext = getCurrentReactContext()
            reactContext?.runOnJSQueueThread {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("sessionExpired", null)
            }
        } catch (e: Exception) {
            // If React Native context is not available, we can't send the event
            // The session is already cleared, so next app start will go to login
        }
    }
    
    private fun getCurrentActivityContext(): Context? {
        return try {
            val mainActivity = MainActivity::class.java
            val currentActivityField = mainActivity.getDeclaredField("sCurrentActivity")
            currentActivityField.isAccessible = true
            currentActivityField.get(null) as? Context
        } catch (e: Exception) {
            // Fallback to main activity if available
            getMainActivityInstance()
        }
    }
    
    private fun getMainActivityInstance(): MainActivity? {
        return try {
            // Try to get current activity from React Native context
            val reactContext = getCurrentReactContext()
            reactContext?.currentActivity as? MainActivity
        } catch (e: Exception) {
            null
        }
    }
    
    private fun getCurrentReactContext(): ReactContext? {
        return try {
            // Get React context through the React Application
            val app = context as? MainApplication
            val reactNativeHost = app?.reactNativeHost
            val reactInstanceManager = reactNativeHost?.reactInstanceManager
            reactInstanceManager?.currentReactContext
        } catch (e: Exception) {
            null
        }
    }
}
