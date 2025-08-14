# Version Check Testing Guide

## Current Test Setup

Your app is currently configured with:
- **App Version**: `7.9` (downgraded for testing)
- **Required Version**: `8.0` (from default config)
- **Update Type**: Optional (won't block app usage)
- **Delay**: 5 seconds after app loads

## Testing Steps

### 1. Clean Build and Install
```bash
npx react-native run-android
```

### 2. Expected Behavior
1. **App Starts**: Normal splash screen and onboarding flow
2. **After 5 seconds**: Update dialog appears with "Later" button
3. **Choose "Later"**: App continues normally
4. **Choose "Update Now"**: Redirects to Play Store

### 3. Check Logs
Use `adb logcat` to see debug messages:
```bash
adb logcat | grep -E "(VersionCheck|UpdateDialog|MainActivity)"
```

### 4. Test Different Scenarios

#### A. Test Optional Update (Current Setup)
- App version: `7.9`
- Min version: `8.0`
- Force update: `false`
- Result: Dialog with "Later" button

#### B. Test Force Update
Change in `VersionCheckManager.kt`:
```kotlin
FORCE_UPDATE_KEY to true
```
- Result: Dialog without "Later" button (blocks app)

#### C. Test No Update Required
Change in `VersionCheckManager.kt`:
```kotlin
MIN_VERSION_KEY to "7.8" // Lower than current version
```
- Result: No dialog appears

## Debugging Common Issues

### Issue 1: App Crashes on Startup
**Cause**: Version check interfering with React Native initialization
**Fix**: Increased delay to 5 seconds, removed from App.tsx startup

### Issue 2: Dialog Appears Multiple Times
**Cause**: Multiple lifecycle events triggering version check
**Fix**: Added `versionCheckDone` flag

### Issue 3: Onboarding Flow Disrupted
**Cause**: Version check happening too early
**Fix**: Only check in MainActivity.onResume with delay

### Issue 4: App Closes Instead of Showing Dialog
**Cause**: Context issues or activity finishing
**Fix**: Added activity state checks (isFinishing, isDestroyed)

## Firebase Remote Config Testing

When ready for production testing:

1. **Go to Firebase Console** → Remote Config
2. **Add Parameters**:
   ```json
   {
     "min_version_android": "8.0",
     "latest_version_android": "8.1",
     "force_update_android": true,
     "update_message_android": "Please update to continue"
   }
   ```
3. **Publish Changes**
4. **Test with Real Values**

## Reset to Production Version

When testing is complete:

1. **Restore Version in build.gradle**:
   ```gradle
   versionCode 8
   versionName "8.0"
   ```

2. **Update Default Config**:
   ```kotlin
   MIN_VERSION_KEY to "8.0"
   LATEST_VERSION_KEY to "8.0"
   FORCE_UPDATE_KEY to false
   ```

3. **Remove Test Messages**:
   ```kotlin
   UPDATE_MESSAGE_KEY to "A new version is available."
   ```

## Current Status
- ✅ Version check system implemented
- ✅ Crash issues fixed
- ✅ Optional update dialog working
- ✅ Play Store redirect functional
- 🔄 Testing with version 7.9
- 🔲 Firebase Remote Config setup pending

The system is now stable and won't crash your app during testing.
