# Firebase Remote Config Setup for Version Management

## Overview
This guide explains how to configure Firebase Remote Config to manage app version requirements and force updates.

## Firebase Console Setup

### 1. Access Remote Config
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **Novo Run App**
3. Navigate to **Remote Config** in the left sidebar

### 2. Add Version Parameters

Add these 4 parameters in Remote Config:

#### Parameter 1: `min_version_android`
- **Key**: `min_version_android`
- **Default value**: `8.0`
- **Description**: Minimum required version for Android app
- **Data type**: String

#### Parameter 2: `latest_version_android`
- **Key**: `latest_version_android`
- **Default value**: `8.0`
- **Description**: Latest available version on Play Store
- **Data type**: String

#### Parameter 3: `force_update_android`
- **Key**: `force_update_android`
- **Default value**: `false`
- **Description**: Whether to force update to latest version
- **Data type**: Boolean

#### Parameter 4: `update_message_android`
- **Key**: `update_message_android`
- **Default value**: `"A new version of the app is available. Please update to continue using the app."`
- **Description**: Custom message to show in update dialog
- **Data type**: String

### 3. Publish Configuration
1. Click **"Publish changes"** after adding all parameters
2. Confirm the publication

## Usage Scenarios

### Scenario 1: Optional Update Available
```json
{
  "min_version_android": "8.0",
  "latest_version_android": "8.1",
  "force_update_android": false,
  "update_message_android": "New features available! Update now to get the latest improvements."
}
```
- Users with version 8.0 can continue using the app
- Update dialog will have "Later" button

### Scenario 2: Force Update Required
```json
{
  "min_version_android": "8.1",
  "latest_version_android": "8.1",
  "force_update_android": true,
  "update_message_android": "This version is no longer supported. Please update immediately to continue using the app."
}
```
- Users with version 8.0 must update
- Update dialog will be non-cancelable

### Scenario 3: Critical Security Update
```json
{
  "min_version_android": "8.2",
  "latest_version_android": "8.2",
  "force_update_android": true,
  "update_message_android": "Critical security update required. Please update now for your safety."
}
```
- All users below version 8.2 must update

## Version Management Workflow

### When Publishing New Version:

1. **Upload to Play Store**
   - Upload APK/AAB with new version (e.g., 8.1)
   - Wait for Play Store review and approval

2. **Update Remote Config**
   - Set `latest_version_android` to `"8.1"`
   - Keep `min_version_android` as previous version (e.g., `"8.0"`) for optional update
   - Set `force_update_android` to `false` initially

3. **Force Update Later (if needed)**
   - After some time, increase `min_version_android` to `"8.1"`
   - Set `force_update_android` to `true`
   - Update message for urgency

### Emergency Force Update:
```json
{
  "min_version_android": "8.1",
  "latest_version_android": "8.1", 
  "force_update_android": true,
  "update_message_android": "Critical bug fix required. Please update immediately."
}
```

## Testing

### 1. Test Optional Update
- Set `latest_version_android` to higher than current app version
- Set `force_update_android` to `false`
- App should show "Update Available" dialog with "Later" option

### 2. Test Force Update
- Set `min_version_android` to higher than current app version
- Set `force_update_android` to `true`
- App should show non-cancelable "Update Required" dialog

### 3. Test Version Comparison
- Current app: 8.0
- Set `min_version_android` to `8.0.1`
- Should trigger update (8.0 < 8.0.1)

## Conditions & Targeting

You can add **conditions** in Remote Config to target specific user groups:

### By App Version
- **Condition**: App version
- **Operator**: `<` (less than)
- **Value**: `8.0`
- **Result**: Show force update only to users below version 8.0

### By Country
- **Condition**: Country/Region
- **Operator**: `in`
- **Value**: `US, IN, UK`
- **Result**: Different update behavior by region

### By User Percentage
- **Condition**: Percent of users
- **Value**: `50%`
- **Result**: Gradual rollout to 50% of users first

## Monitoring

### Analytics Events
The app automatically logs these events:
- `version_check_performed`
- `update_dialog_shown`
- `update_required`
- `play_store_redirect`

### Remote Config Analytics
Monitor in Firebase Console:
- Parameter fetch success rate
- Active parameter values
- User segments affected

## Implementation Status

✅ **Completed:**
- Android native version checking
- Firebase Remote Config integration
- Play Store in-app updates
- Force update dialogs
- React Native bridge

🔲 **TODO:**
- Set up Remote Config parameters (follow this guide)
- Test different update scenarios
- Monitor analytics and user behavior

## Support

For issues with Remote Config:
1. Check Firebase Console for parameter values
2. Verify app has internet connection
3. Check Remote Config fetch logs in Android Logcat
4. Test with different parameter values

The version checking happens:
- On app startup (MainApplication.onCreate)
- When app resumes from background (MainActivity.onResume)
- When manually triggered from React Native
