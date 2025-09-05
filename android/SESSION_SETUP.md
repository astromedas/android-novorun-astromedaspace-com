# Android Session Management Setup Guide

## Overview

This guide explains how to integrate the session management system with your existing HTTP client setup.

## Components Implemented

### 1. Session Storage Manager (`SessionManager.kt`)

- Stores login timestamp, userId, userToken, and email in SharedPreferences
- Calculates token age against 30-day expiry threshold
- Provides session validation methods

### 2. HTTP Response Interceptor (`SessionInterceptor.kt`)

- Monitors HTTP responses for 401/400 status codes
- Skips login/register endpoints to avoid false positives
- Only triggers session expiry for authenticated users

### 3. Session Expiry Handler (`SessionExpiryHandler.kt`)

- Shows "Session Expired" AlertDialog
- Clears native session storage
- Sends event to React Native for navigation

### 4. React Native Bridge (`SessionModule.kt` & `SessionPackage.kt`)

- Provides native methods to React Native
- Handles session saving, validation, and clearing

### 5. Lifecycle Integration

- `MainApplication.onCreate()`: Checks session on app startup
- `MainActivity.onResume()`: Checks session when returning from background

## HTTP Client Integration

Since your React Native app uses Axios for API calls, you have two options:

### Option A: Network Module (Recommended)

Create a React Native native module that wraps OkHttp with the session interceptor:

```kotlin
// Add to LocationServiceModule.kt or create new NetworkModule.kt
class NetworkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(SessionInterceptor(reactContext))
        .build()

    @ReactMethod
    fun makeAuthenticatedRequest(url: String, method: String, headers: ReadableMap?, body: String?, promise: Promise) {
        // Implement HTTP requests using okHttpClient
        // This ensures all requests go through the session interceptor
    }
}
```

### Option B: Axios Response Interceptor (Simpler)

Add this to your React Native code where Axios is configured:

```typescript
// src/utils/httpClient.ts
import axios from 'axios';
import SessionManager from './SessionManager';

const httpClient = axios.create({
  baseURL: 'https://ecf63b299473.ngrok-free.app/api',
});

// Response interceptor to handle session expiry
httpClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 || error.response?.status === 400) {
      const sessionManager = SessionManager.getInstance();
      const isLoggedIn = await sessionManager.isSessionValid();

      if (isLoggedIn && !error.config.url.includes('/user/auth/signin')) {
        // Session expired, clear storage and let native handle dialog
        await sessionManager.clearSession();
      }
    }
    return Promise.reject(error);
  },
);

export default httpClient;
```

## Testing

### 1. Time-based Expiry Test

```bash
# Login to app
# Change device time forward 31 days: Settings > Date & Time > Set manually
# Reopen app or resume from background
# Should show "Session Expired" popup
```

### 2. Server Response Test

```bash
# Login to app
# Make API call that returns 401 (modify server temporarily or use network tools)
# Should show popup immediately
```

### 3. Navigation Test

```bash
# Trigger session expiry from any screen in the app
# Verify popup appears regardless of current screen
# Verify tapping "Login Again" navigates to login screen
```

## Integration Steps

1. ✅ Session components are already implemented
2. ✅ Lifecycle hooks are integrated
3. ✅ React Native bridge is set up
4. 🔲 **TODO**: Integrate HTTP interceptor (choose Option A or B above)
5. 🔲 **TODO**: Replace direct AsyncStorage usage with SessionManager in React Native
6. 🔲 **TODO**: Test session expiry scenarios

## Key Files Modified

- `MainApplication.kt` - Added session check on startup + SessionPackage registration
- `MainActivity.kt` - Added session check on resume
- `LoginScreen.tsx` - Updated to use SessionManager
- `build.gradle` - Added OkHttp dependency

## Session Flow

1. **Login Success**: Save timestamp + session data to both AsyncStorage and SharedPreferences
2. **App Startup/Resume**: Check session validity (time-based)
3. **API Calls**: Monitor for 401/400 responses (server-based)
4. **Session Expired**: Show dialog → Clear storage → Navigate to login

This implementation matches your React Native session management behavior while adding native Android session tracking.
