package com.novorun.app

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class LocationServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private var locationService: LocationService? = null
    private var isServiceBound = false
    
    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as LocationService.LocalBinder
            locationService = binder.getService()
            isServiceBound = true
        }
        
        override fun onServiceDisconnected(name: ComponentName?) {
            locationService = null
            isServiceBound = false
        }
    }
    
    override fun getName(): String = "LocationService"
    
    init {
        // Bind to service on module creation
        bindService()
    }
    
    private fun bindService() {
        val intent = Intent(reactApplicationContext, LocationService::class.java)
        reactApplicationContext.startService(intent.apply { action = "START" })
        reactApplicationContext.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
    }
    
    @ReactMethod
    fun startTracking(trackingType: String, weightStr: String, eventId: String, distance: String, category: String, promise: Promise) {
        try {
            val weight = weightStr.toFloatOrNull() ?: 70f
            if (locationService?.startTracking(trackingType, weight, eventId, distance, category) == true) {
                promise.resolve(true)
            } else {
                promise.reject("ALREADY_TRACKING", "Tracking is already active")
            }
        } catch (e: Exception) {
            promise.reject("START_ERROR", "Failed to start tracking: ${e.message}")
        }
    }
    
    @ReactMethod
    fun getTrackingType(promise: Promise) {
        try {
            val trackingType = locationService?.getTrackingType() ?: "activity"
            promise.resolve(trackingType)
        } catch (e: Exception) {
            promise.reject("GET_TYPE_ERROR", "Failed to get tracking type: ${e.message}")
        }
    }
    
    @ReactMethod
    fun pauseResumeTracking(promise: Promise) {
        try {
            val isPaused = locationService?.pauseResumeTracking()
            if (isPaused != null) {
                promise.resolve(isPaused)
            } else {
                promise.reject("NOT_TRACKING", "No active tracking session")
            }
        } catch (e: Exception) {
            promise.reject("PAUSE_ERROR", "Failed to pause/resume tracking: ${e.message}")
        }
    }
    
    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            val finalData = locationService?.stopTracking()
            if (finalData != null) {
                val result = Arguments.createMap().apply {
                    putDouble("distance", finalData["distance"] as? Double ?: 0.0)
                    putDouble("duration", (finalData["duration"] as? Long)?.toDouble() ?: 0.0)
                    putBoolean("isTracking", finalData["isTracking"] as? Boolean ?: false)
                    
                    @Suppress("UNCHECKED_CAST")
                    val coordinates = finalData["coordinates"] as? List<Map<String, Any>> ?: emptyList()
                    val coordArray = Arguments.createArray()
                    coordinates.forEach { coord ->
                        val coordMap = Arguments.createMap().apply {
                            putDouble("latitude", coord["latitude"] as? Double ?: 0.0)
                            putDouble("longitude", coord["longitude"] as? Double ?: 0.0)
                        }
                        coordArray.pushMap(coordMap)
                    }
                    putArray("coordinates", coordArray)
                }
                promise.resolve(result)
            } else {
                promise.reject("STOP_ERROR", "No active tracking session")
            }
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop tracking: ${e.message}")
        }
    }
    
    @ReactMethod
    fun getCurrentTrackingData(promise: Promise) {
        try {
            val data = locationService?.getCurrentTrackingData()
            if (data != null) {
                val result = Arguments.createMap().apply {
                    putBoolean("isTracking", data["isTracking"] as? Boolean ?: false)
                    putBoolean("isPaused", data["isPaused"] as? Boolean ?: false)
                    putDouble("distance", data["distance"] as? Double ?: 0.0)
                    putDouble("duration", (data["duration"] as? Long)?.toDouble() ?: 0.0)
                    
                    @Suppress("UNCHECKED_CAST")
                    val coordinates = data["coordinates"] as? List<Map<String, Any>> ?: emptyList()
                    val coordArray = Arguments.createArray()
                    coordinates.forEach { coord ->
                        val coordMap = Arguments.createMap().apply {
                            putDouble("latitude", coord["latitude"] as? Double ?: 0.0)
                            putDouble("longitude", coord["longitude"] as? Double ?: 0.0)
                        }
                        coordArray.pushMap(coordMap)
                    }
                    putArray("coordinates", coordArray)
                    
                    @Suppress("UNCHECKED_CAST")
                    val currentLocation = data["currentLocation"] as? Map<String, Any>
                    if (currentLocation != null) {
                        val locMap = Arguments.createMap().apply {
                            putDouble("latitude", currentLocation["latitude"] as? Double ?: 0.0)
                            putDouble("longitude", currentLocation["longitude"] as? Double ?: 0.0)
                        }
                        putMap("currentLocation", locMap)
                    }
                }
                promise.resolve(result)
            } else {
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("isTracking", false)
                    putBoolean("isPaused", false)
                    putDouble("distance", 0.0)
                    putDouble("duration", 0.0)
                    putArray("coordinates", Arguments.createArray())
                })
            }
        } catch (e: Exception) {
            promise.reject("GET_DATA_ERROR", "Failed to get tracking data: ${e.message}")
        }
    }
    
    @ReactMethod
    fun clearTrackingData(promise: Promise) {
        try {
            locationService?.clearTrackingData()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_ERROR", "Failed to clear tracking data: ${e.message}")
        }
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        if (isServiceBound) {
            reactApplicationContext.unbindService(serviceConnection)
            isServiceBound = false
        }
    }
}
