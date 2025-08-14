package com.novorun.app

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log

class UpdateDialogHandler private constructor(private val context: Context) {
    
    companion object {
        private const val TAG = "UpdateDialogHandler"
        private const val PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.novorun.app"
        
        @Volatile
        private var INSTANCE: UpdateDialogHandler? = null
        
        fun getInstance(context: Context): UpdateDialogHandler {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: UpdateDialogHandler(context).also { INSTANCE = it }
            }
        }
    }
    
    fun showUpdateDialog(title: String, message: String, isForceUpdate: Boolean) {
        try {
            // Check if context is an Activity and not finishing
            if (context is android.app.Activity) {
                val activity = context as android.app.Activity
                if (activity.isFinishing || activity.isDestroyed) {
                    Log.w(TAG, "Activity is finishing, not showing dialog")
                    return
                }
            }
            
            val alertDialog = AlertDialog.Builder(context)
                .setTitle(title)
                .setMessage(message)
                .setCancelable(!isForceUpdate)
                .setPositiveButton("Update Now") { dialog, _ ->
                    dialog.dismiss()
                    redirectToPlayStore()
                }
            
            // Only show "Later" button if it's not a force update
            if (!isForceUpdate) {
                alertDialog.setNegativeButton("Later") { dialog, _ ->
                    dialog.dismiss()
                }
            } else {
                // For force updates, also handle back button and outside touch
                alertDialog.setOnCancelListener { 
                    // Prevent dismissal, show dialog again only if activity is still active
                    if (context is android.app.Activity) {
                        val activity = context as android.app.Activity
                        if (!activity.isFinishing && !activity.isDestroyed) {
                            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                showUpdateDialog(title, message, isForceUpdate)
                            }, 500)
                        }
                    }
                }
            }
            
            val dialog = alertDialog.create()
            dialog.show()
        } catch (e: Exception) {
            Log.e(TAG, "Error showing update dialog", e)
            // Fallback: directly redirect to Play Store only if it's a force update
            if (isForceUpdate) {
                redirectToPlayStore()
            }
        }
    }
    
    fun redirectToPlayStore() {
        try {
            // Try to open Play Store app first
            val playStoreIntent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.novorun.app"))
            playStoreIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            if (playStoreIntent.resolveActivity(context.packageManager) != null) {
                context.startActivity(playStoreIntent)
            } else {
                // Fallback to browser if Play Store app is not installed
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(PLAY_STORE_URL))
                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(browserIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error redirecting to Play Store", e)
        }
    }
    
    fun showForceUpdateDialog() {
        showUpdateDialog(
            "Update Required",
            "This version of the app is no longer supported. Please update to the latest version to continue using the app.",
            true
        )
    }
    
    fun showOptionalUpdateDialog() {
        showUpdateDialog(
            "Update Available",
            "A new version of the app is available with improvements and new features. Would you like to update now?",
            false
        )
    }
}
