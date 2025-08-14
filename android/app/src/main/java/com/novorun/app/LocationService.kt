package com.novorun.app

import android.app.*
import android.content.Intent
import android.os.IBinder
import android.os.Build
import androidx.core.app.NotificationCompat
import android.location.Location
import com.google.android.gms.location.*
import android.app.PendingIntent
import android.app.Service
import android.util.Log
import android.os.PowerManager
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.*

class LocationService : Service() {
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var sharedPrefs: SharedPreferences
    private lateinit var wakeLock: PowerManager.WakeLock
    
    private var lastLocation: Location? = null
    private var startTime: Long = 0
    private var distanceCovered: Float = 0f
    private var isTracking: Boolean = false
    private var isPaused: Boolean = false
    private var pausedTime: Long = 0
    private var totalPausedDuration: Long = 0
    private var userWeight: Float = 0f
    private var eventID: String = ""
    private var raceDistance: String = ""
    private var raceCategory: String = ""
    
    // Route storage
    private val walkedRoute = mutableListOf<Location>()
    private var lastNotificationUpdate: Long = 0
    private val notificationUpdateInterval = 30000L // 30 seconds
private fun logDebug(message: String) {
    Log.d("LocationService", message)
}

    private fun logInfo(message: String) {
        Log.i("LocationService", message)
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        sharedPrefs = getSharedPreferences("NovoTracking", Context.MODE_PRIVATE)
        createNotificationChannel()
        
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "NovoRun::LocationWakeLock"
        )

        // Restore previous tracking state if exists
        restoreTrackingState()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                if (!isTracking || isPaused) return
                
                locationResult.lastLocation?.let { location ->
                    if (location.accuracy <= 25f && shouldSaveLocation(location)) {
                        updateTracking(location)
                        persistTrackingData()
                    }
                }
            }
        }
    }

    private fun shouldSaveLocation(newLocation: Location): Boolean {
        if (lastLocation == null) return true
        val distance = lastLocation!!.distanceTo(newLocation)
        val timeDiff = (newLocation.time - lastLocation!!.time) / 1000.0
        val speed = if (timeDiff > 0) distance / timeDiff else 0.0
        
        // More precise filtering for smooth curves
        return distance >= 1f && // 1 meter minimum
               distance <= 50f && // Filter GPS jumps
               speed >= 0.3 && // Minimum walking speed (1 km/h)
               speed <= 15.0 && // Maximum reasonable speed (54 km/h)
               newLocation.accuracy <= 15f // Good GPS accuracy
    }

    private fun restoreTrackingState() {
        isTracking = sharedPrefs.getBoolean("isTracking", false)
        isPaused = sharedPrefs.getBoolean("isPaused", false)
        startTime = sharedPrefs.getLong("startTime", 0)
        distanceCovered = sharedPrefs.getFloat("distanceCovered", 0f)
        totalPausedDuration = sharedPrefs.getLong("totalPausedDuration", 0)
        userWeight = sharedPrefs.getFloat("userWeight", 0f)
        eventID = sharedPrefs.getString("eventID", "") ?: ""
        raceDistance = sharedPrefs.getString("raceDistance", "") ?: ""
        raceCategory = sharedPrefs.getString("raceCategory", "") ?: ""
        
        // Restore route coordinates
        val routeJson = sharedPrefs.getString("walkedRoute", "[]")
        try {
            val jsonArray = JSONArray(routeJson)
            walkedRoute.clear()
            for (i in 0 until jsonArray.length()) {
                val point = jsonArray.getJSONObject(i)
                val location = Location("restored").apply {
                    latitude = point.getDouble("lat")
                    longitude = point.getDouble("lng")
                    time = point.getLong("time")
                    accuracy = point.getDouble("accuracy").toFloat()
                }
                walkedRoute.add(location)
            }
            if (walkedRoute.isNotEmpty()) {
                lastLocation = walkedRoute.last()
            }
        } catch (e: Exception) {
            logDebug("Error restoring route: ${e.message}")
        }
        
        logInfo("Restored state - Tracking: $isTracking, Distance: ${distanceCovered}m, Route points: ${walkedRoute.size}")
    }

    private fun persistTrackingData() {
        val editor = sharedPrefs.edit()
        editor.putBoolean("isTracking", isTracking)
        editor.putBoolean("isPaused", isPaused)
        editor.putLong("startTime", startTime)
        editor.putFloat("distanceCovered", distanceCovered)
        editor.putLong("totalPausedDuration", totalPausedDuration)
        editor.putFloat("userWeight", userWeight)
        editor.putString("eventID", eventID)
        editor.putString("raceDistance", raceDistance)
        editor.putString("raceCategory", raceCategory)
        editor.putLong("lastUpdateTime", System.currentTimeMillis())
        
        // Persist route coordinates (keep only every 3rd point to save space)
        val routeArray = JSONArray()
        walkedRoute.forEachIndexed { index, location ->
            if (index % 3 == 0 || index == walkedRoute.size - 1) { // Keep every 3rd point + last point
                val point = JSONObject().apply {
                    put("lat", location.latitude)
                    put("lng", location.longitude)
                    put("time", location.time)
                    put("accuracy", location.accuracy.toDouble())
                }
                routeArray.put(point)
            }
        }
        editor.putString("walkedRoute", routeArray.toString())
        editor.apply()
    }

    private fun updateTracking(newLocation: Location) {
        lastLocation?.let { last ->
            val newDistance = last.distanceTo(newLocation)
            val timeDiff = (newLocation.time - last.time) / 1000.0
            val speed = if (timeDiff > 0) newDistance / timeDiff else 0.0
            
            // Only add distance if moving at reasonable speed
            if (speed >= 0.3 && newDistance <= 50f) {
                distanceCovered += newDistance
                logDebug("Distance updated: +${newDistance}m, Total: ${distanceCovered}m, Speed: ${speed}m/s")
            }
        }
        
        lastLocation = newLocation
        walkedRoute.add(newLocation)

        val currentTime = System.currentTimeMillis()
        val activeDuration = ((currentTime - startTime - totalPausedDuration) / 1000).coerceAtLeast(1)
        val distanceKm = distanceCovered / 1000

        // Update notification every 30 seconds
        if (currentTime - lastNotificationUpdate >= notificationUpdateInterval) {
            updateNotification(distanceKm, activeDuration)
            lastNotificationUpdate = currentTime
        }
    }

    // Get current tracking data - called directly by React Native
    fun getCurrentTrackingData(): Map<String, Any?> {
        val currentTime = System.currentTimeMillis()
        val activeDuration = if (startTime > 0) {
            ((currentTime - startTime - totalPausedDuration) / 1000).coerceAtLeast(0)
        } else 0
        
        val routeCoordinates = walkedRoute.map { location ->
            mapOf(
                "latitude" to location.latitude,
                "longitude" to location.longitude,
                "accuracy" to location.accuracy.toDouble(),
                "timestamp" to location.time
            )
        }
        
        return mapOf(
            "isTracking" to isTracking,
            "isPaused" to isPaused,
            "distance" to (distanceCovered / 1000).toDouble(), // Convert to km
            "duration" to activeDuration,
            "weight" to userWeight.toDouble(), // Include stored user weight
            "eventID" to eventID,
            "raceDistance" to raceDistance,
            "raceCategory" to raceCategory,
            "coordinates" to routeCoordinates,
            "currentLocation" to if (lastLocation != null) {
                mapOf(
                    "latitude" to lastLocation!!.latitude,
                    "longitude" to lastLocation!!.longitude
                )
            } else null
        )
    }

    // Start tracking - called directly by React Native
    fun startTracking(trackingType: String = "activity", weight: Float = 0f, eventId: String = "", distance: String = "", category: String = ""): Boolean {
        if (isTracking) return false
        
        logInfo("Starting tracking - Type: $trackingType, Weight: ${weight}kg, EventID: $eventId, Distance: $distance")
        isTracking = true
        isPaused = false
        startTime = System.currentTimeMillis()
        distanceCovered = 0f
        totalPausedDuration = 0
        userWeight = weight
        eventID = eventId
        raceDistance = distance
        raceCategory = category
        walkedRoute.clear()
        lastLocation = null
        
        // Store tracking type for auto-navigation
        sharedPrefs.edit().putString("trackingType", trackingType).apply()
        
        persistTrackingData()
        
        if (!wakeLock.isHeld) {
            wakeLock.acquire(24 * 60 * 60 * 1000L) // 24 hours
        }
        
        startLocationUpdates()
        return true
    }
    
    // Get tracking type - called by React Native for auto-navigation
    fun getTrackingType(): String {
        return sharedPrefs.getString("trackingType", "activity") ?: "activity"
    }

    // Pause/Resume tracking - called directly by React Native
    fun pauseResumeTracking(): Boolean {
        if (!isTracking) return false
        
        isPaused = !isPaused
        
        if (isPaused) {
            pausedTime = System.currentTimeMillis()
            fusedLocationClient.removeLocationUpdates(locationCallback)
            logInfo("Tracking paused")
        } else {
            totalPausedDuration += System.currentTimeMillis() - pausedTime
            startLocationUpdates()
            logInfo("Tracking resumed")
        }
        
        persistTrackingData()
        return isPaused
    }

    // Stop tracking - called directly by React Native
    fun stopTracking(): Map<String, Any?> {
        logInfo("Stopping tracking")
        
        val finalData = getCurrentTrackingData()
        
        isTracking = false
        isPaused = false
        fusedLocationClient.removeLocationUpdates(locationCallback)
        
        if (wakeLock.isHeld) {
            wakeLock.release()
        }
        
        // Remove foreground notification completely
        stopForeground(true) // true = remove notification
        
        // Clear stored data
        sharedPrefs.edit().clear().apply()
        
        stopSelf()
        logInfo("Tracking stopped and notification removed")
        return finalData
    }

   private fun startLocationUpdates() {
    val locationRequest = LocationRequest.create().apply {
        priority = LocationRequest.PRIORITY_HIGH_ACCURACY
        interval = 2000  // 2 seconds for smooth tracking
        fastestInterval = 1000  // 1 second fastest for real-time updates
        smallestDisplacement = 1f  // 1 meter for detailed curve tracking
    }

    try {
        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            mainLooper
        )
    } catch (e: SecurityException) {
        e.printStackTrace()
    }
}

    private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Location Service Channel",
            NotificationManager.IMPORTANCE_HIGH  // Change to HIGH
        ).apply {
            description = "Shows tracking information"
            enableLights(true)
            enableVibration(true)
            setShowBadge(true)
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }
}

   private fun updateNotification(distance: Float, duration: Long, targetDistance: Float = 0f) {
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle(if (distance >= targetDistance && targetDistance > 0) "Race Completed!" else "Tracking Active")
        .setContentText("Distance: ${String.format("%.2f", distance)}km | Time: ${formatDuration(duration)}")
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentIntent(createPendingIntent())
        .setOngoing(true)
        .build()

    startForeground(NOTIFICATION_ID, notification)

    if (distance >= targetDistance && targetDistance > 0) {
        // Send broadcast to notify race completion
        val intent = Intent("race-completed")
        sendBroadcast(intent)
        // Stop the service
        stopSelf()
    }
}

    private fun createPendingIntent(): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            action = "OPEN_MAP_SCREEN"
            putExtra("openMap", true)
        }
        
        return PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun formatDuration(seconds: Long): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60
        return String.format("%02d:%02d:%02d", hours, minutes, secs)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        logInfo("Service command received: ${intent?.action}")
        
        // Check if we have all required permissions
        if (!hasRequiredPermissions()) {
            logInfo("Missing required permissions for foreground location service")
            stopSelf()
            return START_NOT_STICKY
        }
        
        // Always run as foreground service when tracking
        if (isTracking || intent?.action == "START") {
            try {
                startForeground(NOTIFICATION_ID, createNotification())
            } catch (e: SecurityException) {
                logInfo("SecurityException starting foreground service: ${e.message}")
                stopSelf()
                return START_NOT_STICKY
            }
        }
        
        when (intent?.action) {
            "START" -> {
                logInfo("Starting foreground service")
                // If we were already tracking, resume location updates (app restart scenario)
                if (isTracking && !isPaused) {
                    logInfo("Resuming tracking after app restart")
                    startLocationUpdates()
                }
            }
            "STOP" -> {
                logInfo("Stopping location tracking service")
                stopTracking()
            }
            null -> {
                // Service was restarted by system while tracking was active
                if (isTracking) {
                    logInfo("Service auto-restarted while tracking - resuming GPS")
                    try {
                        startForeground(NOTIFICATION_ID, createNotification())
                        if (!isPaused) {
                            startLocationUpdates()
                        }
                    } catch (e: Exception) {
                        logInfo("Error resuming tracking after restart: ${e.message}")
                    }
                }
            }
        }
        
        return START_STICKY // Service will restart if killed
    }
    
    private fun hasRequiredPermissions(): Boolean {
        val hasLocationPermission = ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED || 
        ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        
        val hasForegroundServicePermission = if (Build.VERSION.SDK_INT >= 34) { // Android 14+
            ContextCompat.checkSelfPermission(
                this,
                android.Manifest.permission.FOREGROUND_SERVICE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // Not required for older versions
        }
        
        logInfo("Permissions - Location: $hasLocationPermission, ForegroundService: $hasForegroundServicePermission")
        return hasLocationPermission && hasForegroundServicePermission
    }

    // Clear all tracking data
    fun clearTrackingData() {
        sharedPrefs.edit().clear().apply()
        isTracking = false
        isPaused = false
        startTime = 0
        distanceCovered = 0f
        totalPausedDuration = 0
        walkedRoute.clear()
        lastLocation = null
        logInfo("Tracking data cleared")
    }

   private fun createNotification(): Notification {
    return NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("Tracking Active")
        .setContentText("Tap to return to tracking")
        .setSmallIcon(R.mipmap.ic_launcher)
        .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setCategory(NotificationCompat.CATEGORY_SERVICE)
        .setContentIntent(createPendingIntent())
        .setOngoing(true)
        .setAutoCancel(false)
        .build()
}

    // Binder for React Native module communication
    inner class LocalBinder : android.os.Binder() {
        fun getService(): LocationService = this@LocationService
    }
    
    private val binder = LocalBinder()
    
    override fun onBind(intent: Intent?): IBinder = binder

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }

    companion object {
        private const val CHANNEL_ID = "location_service_channel"
        private const val NOTIFICATION_ID = 1
    }
}