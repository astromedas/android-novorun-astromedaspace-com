package com.novorun.app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class VersionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "VersionModule"
    }
    
    @ReactMethod
    fun checkForUpdates(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity != null) {
                val versionCheckManager = VersionCheckManager.getInstance(reactApplicationContext)
                versionCheckManager.checkForUpdates(activity) { updateRequired, message ->
                    val result = mapOf(
                        "updateRequired" to updateRequired,
                        "message" to (message ?: ""),
                        "playStoreUrl" to "https://play.google.com/store/apps/details?id=com.novorun.app"
                    )
                    promise.resolve(result)
                }
            } else {
                promise.reject("NO_ACTIVITY", "No current activity available")
            }
        } catch (e: Exception) {
            promise.reject("VERSION_CHECK_ERROR", "Failed to check for updates", e)
        }
    }
    
    @ReactMethod
    fun getCurrentVersion(promise: Promise) {
        try {
            val packageInfo = reactApplicationContext.packageManager
                .getPackageInfo(reactApplicationContext.packageName, 0)
            val versionInfo = mapOf(
                "versionName" to (packageInfo.versionName ?: "1.0"),
                "versionCode" to packageInfo.versionCode,
                "packageName" to reactApplicationContext.packageName
            )
            promise.resolve(versionInfo)
        } catch (e: Exception) {
            promise.reject("VERSION_INFO_ERROR", "Failed to get version info", e)
        }
    }
    
    @ReactMethod
    fun showUpdateDialog(title: String, message: String, isForceUpdate: Boolean, promise: Promise) {
        try {
            val activity = currentActivity
            if (activity != null) {
                UpdateDialogHandler.getInstance(activity).showUpdateDialog(title, message, isForceUpdate)
                promise.resolve(true)
            } else {
                promise.reject("NO_ACTIVITY", "No current activity available")
            }
        } catch (e: Exception) {
            promise.reject("DIALOG_ERROR", "Failed to show update dialog", e)
        }
    }
    
    @ReactMethod
    fun redirectToPlayStore(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity != null) {
                UpdateDialogHandler.getInstance(activity).redirectToPlayStore()
                promise.resolve(true)
            } else {
                promise.reject("NO_ACTIVITY", "No current activity available")
            }
        } catch (e: Exception) {
            promise.reject("REDIRECT_ERROR", "Failed to redirect to Play Store", e)
        }
    }
}
