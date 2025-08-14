package com.novorun.app

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactInstanceManager
import com.facebook.react.bridge.ReactContext
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.firebase.Firebase
import com.google.firebase.initialize
import com.google.firebase.appcheck.appCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import org.devio.rn.splashscreen.SplashScreen

class MainActivity : ReactActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme)
        
        // FIX: Prevent restoring old fragments
        super.onCreate(null) // Ensure no savedInstanceState is passed

        // Initialize Firebase
        Firebase.initialize(this)
        Firebase.appCheck.installAppCheckProviderFactory(
            PlayIntegrityAppCheckProviderFactory.getInstance()
        )

        handleIntent(intent)
    }
    
    override fun onResume() {
        super.onResume()
        // Check session expiry when app becomes active from background
        checkSessionOnResume()
        // Check for app updates with longer delay to ensure app is fully loaded
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            checkForUpdates()
        }, 5000) // 5 second delay to let app fully load
    }
    
    private fun checkSessionOnResume() {
        val sessionManager = SessionManager.getInstance(this)
        if (sessionManager.isSessionExpired()) {
            SessionExpiryHandler.getInstance(this).handleSessionExpiry()
        }
    }
    
    private var versionCheckDone = false
    
    private fun checkForUpdates() {
        try {
            if (isFinishing || isDestroyed || versionCheckDone) {
                return // Don't show dialog if activity is finishing or already checked
            }
            
            // Check if we're in onboarding flow by looking at current fragment/intent
            val currentIntent = intent
            if (currentIntent?.getBooleanExtra("skipVersionCheck", false) == true) {
                return // Skip version check if explicitly requested
            }
            
            versionCheckDone = true // Mark as done to prevent multiple dialogs
            
            val versionCheckManager = VersionCheckManager.getInstance(this)
            versionCheckManager.checkForUpdates(this) { updateRequired, message ->
                try {
                    if (updateRequired && !isFinishing && !isDestroyed) {
                        val updateMessage = message ?: "A new version is available. Please update to continue."
                        // Show optional update dialog for testing
                        UpdateDialogHandler.getInstance(this).showOptionalUpdateDialog()
                    }
                } catch (e: Exception) {
                    android.util.Log.e("MainActivity", "Error showing update dialog", e)
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error checking for updates", e)
        }
    }

    override fun getMainComponentName(): String = "Novo"

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        if (intent?.action == "OPEN_MAP_SCREEN" || intent?.getBooleanExtra("openMap", false) == true) {
            val reactInstanceManager = reactInstanceManager
            
            reactInstanceManager.addReactInstanceEventListener(object : ReactInstanceManager.ReactInstanceEventListener {
                override fun onReactContextInitialized(context: ReactContext) {
                    context.runOnJSQueueThread {
                        context
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            ?.emit("openMapFromNotification", null)
                    }
                    reactInstanceManager.removeReactInstanceEventListener(this)
                }
            })
        }
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
