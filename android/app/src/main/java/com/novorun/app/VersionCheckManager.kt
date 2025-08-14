package com.novorun.app

import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import com.google.firebase.remoteconfig.FirebaseRemoteConfigSettings
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class VersionCheckManager private constructor(private val context: Context) {
    
    private val remoteConfig: FirebaseRemoteConfig = FirebaseRemoteConfig.getInstance()
    private val appUpdateManager: AppUpdateManager = AppUpdateManagerFactory.create(context)
    
    companion object {
        private const val TAG = "VersionCheckManager"
        private const val MIN_VERSION_KEY = "min_version_android"
        private const val LATEST_VERSION_KEY = "latest_version_android"
        private const val FORCE_UPDATE_KEY = "force_update_android"
        private const val UPDATE_MESSAGE_KEY = "update_message_android"
        
        @Volatile
        private var INSTANCE: VersionCheckManager? = null
        
        fun getInstance(context: Context): VersionCheckManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: VersionCheckManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
    
    init {
        setupRemoteConfig()
    }
    
    private fun setupRemoteConfig() {
        val configSettings = FirebaseRemoteConfigSettings.Builder()
            .setMinimumFetchIntervalInSeconds(0) // 0 for immediate testing
            .build()
        remoteConfig.setConfigSettingsAsync(configSettings)
        
        // Set default values (Firebase only used for special cases, Play Store handles routine updates)
        val defaults = mapOf(
            MIN_VERSION_KEY to "1.0", // Very low version - Play Store handles routine updates
            LATEST_VERSION_KEY to "999.0", // Very high version to avoid conflicts
            FORCE_UPDATE_KEY to false, // Only true for emergency updates
            UPDATE_MESSAGE_KEY to "New version available on Play Store"
        )
        remoteConfig.setDefaultsAsync(defaults)
    }
    
    fun checkForUpdates(activity: Activity, callback: (Boolean, String?) -> Unit) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Check Play Store first for automatic version detection
                checkPlayStoreUpdate(activity) { playStoreUpdateAvailable, playStoreMessage ->
                    if (playStoreUpdateAvailable) {
                        // Play Store has update available - check if Firebase wants to override behavior
                        remoteConfig.fetchAndActivate().addOnCompleteListener { task ->
                            if (task.isSuccessful) {
                                checkFirebaseOverrides(activity, callback)
                            } else {
                                // Use Play Store update without Firebase overrides
                                callback(true, playStoreMessage ?: "New version available on Play Store")
                            }
                        }
                    } else {
                        // No Play Store update - check if Firebase forces an update anyway
                        remoteConfig.fetchAndActivate().addOnCompleteListener { task ->
                            if (task.isSuccessful) {
                                checkFirebaseForceUpdate(activity, callback)
                            } else {
                                callback(false, null)
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error checking for updates", e)
                withContext(Dispatchers.Main) {
                    callback(false, null)
                }
            }
        }
    }
    
    private fun checkFirebaseOverrides(activity: Activity, callback: (Boolean, String?) -> Unit) {
        try {
            val forceUpdate = remoteConfig.getBoolean(FORCE_UPDATE_KEY)
            val updateMessage = remoteConfig.getString(UPDATE_MESSAGE_KEY)
            
            Log.d(TAG, "Firebase override - Force update: $forceUpdate")
            Log.d(TAG, "Firebase override - Message: $updateMessage")
            
            // Use Firebase message if available, otherwise default Play Store message
            val finalMessage = if (updateMessage.isNotEmpty()) updateMessage else "New version available on Play Store"
            callback(true, finalMessage)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Firebase overrides", e)
            callback(true, "New version available on Play Store")
        }
    }
    
    private fun checkFirebaseForceUpdate(activity: Activity, callback: (Boolean, String?) -> Unit) {
        try {
            val currentVersion = getCurrentAppVersion()
            val minVersion = remoteConfig.getString(MIN_VERSION_KEY)
            val latestVersion = remoteConfig.getString(LATEST_VERSION_KEY)
            val forceUpdate = remoteConfig.getBoolean(FORCE_UPDATE_KEY)
            val updateMessage = remoteConfig.getString(UPDATE_MESSAGE_KEY)
            
            Log.d(TAG, "Firebase force check - Current version: $currentVersion")
            Log.d(TAG, "Firebase force check - Min version: $minVersion")
            Log.d(TAG, "Firebase force check - Latest version: $latestVersion")
            Log.d(TAG, "Firebase force check - Force update: $forceUpdate")
            
            val isForceUpdateRequired = when {
                forceUpdate -> isVersionLower(currentVersion, latestVersion)
                else -> isVersionLower(currentVersion, minVersion)
            }
            
            if (isForceUpdateRequired) {
                val finalMessage = if (updateMessage.isNotEmpty()) updateMessage else "App update required"
                callback(true, finalMessage)
            } else {
                callback(false, null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Firebase force update", e)
            callback(false, null)
        }
    }
    
    private fun checkPlayStoreUpdate(activity: Activity, callback: (Boolean, String?) -> Unit) {
        appUpdateManager.appUpdateInfo.addOnSuccessListener { appUpdateInfo ->
            when {
                appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE -> {
                    // Try immediate update first
                    if (appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                        startImmediateUpdate(activity, appUpdateInfo)
                        callback(true, "Update in progress...")
                    } else {
                        // Fallback to Play Store redirect
                        callback(true, null)
                    }
                }
                else -> {
                    Log.d(TAG, "No Play Store update available")
                    callback(false, null)
                }
            }
        }.addOnFailureListener { exception ->
            Log.e(TAG, "Failed to check Play Store update", exception)
            // Handle the specific error for app not owned
            if (exception.message?.contains("ERROR_APP_NOT_OWNED") == true) {
                // For development or testing environments, simulate an update is available
                // This allows testing the update flow even when the app is not from Play Store
                Log.d(TAG, "App not owned by user, simulating update available for testing")
                callback(true, "New version available on Play Store")
            } else {
                callback(false, null)
            }
        }
    }
    
    private fun startImmediateUpdate(activity: Activity, appUpdateInfo: AppUpdateInfo) {
        try {
            appUpdateManager.startUpdateFlow(
                appUpdateInfo,
                activity,
                AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build()
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start immediate update", e)
            // Fallback to showing custom dialog
            UpdateDialogHandler.getInstance(activity).showUpdateDialog(
                "Update Required",
                "Please update the app to continue using it.",
                true
            )
        }
    }
    
    private fun getCurrentAppVersion(): String {
        return try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            packageInfo.versionName ?: "1.0"
        } catch (e: PackageManager.NameNotFoundException) {
            Log.e(TAG, "Package not found", e)
            "1.0"
        }
    }
    
    private fun isVersionLower(currentVersion: String, requiredVersion: String): Boolean {
        return try {
            val current = parseVersion(currentVersion)
            val required = parseVersion(requiredVersion)
            
            for (i in 0 until maxOf(current.size, required.size)) {
                val currentPart = current.getOrNull(i) ?: 0
                val requiredPart = required.getOrNull(i) ?: 0
                
                when {
                    currentPart < requiredPart -> return true
                    currentPart > requiredPart -> return false
                }
            }
            false
        } catch (e: Exception) {
            Log.e(TAG, "Error comparing versions", e)
            false
        }
    }
    
    private fun parseVersion(version: String): List<Int> {
        return version.split(".").mapNotNull { 
            try { 
                it.toInt() 
            } catch (e: NumberFormatException) { 
                0 
            } 
        }
    }
}
