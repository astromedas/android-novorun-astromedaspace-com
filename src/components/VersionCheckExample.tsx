import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import VersionManager from '../utils/VersionManager';

// Example component showing how to use VersionManager in your screens
const VersionCheckExample: React.FC = () => {
  const [versionInfo, setVersionInfo] = useState<any>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('Checking...');

  useEffect(() => {
    checkVersionOnMount();
  }, []);

  const checkVersionOnMount = async () => {
    const versionManager = VersionManager.getInstance();
    
    // Get current version info
    const currentVersion = await versionManager.getCurrentVersion();
    setVersionInfo(currentVersion);
    
    // Check for updates
    const updateCheck = await versionManager.checkForUpdates();
    
    if (updateCheck?.updateRequired) {
      setUpdateStatus('Update required');
    } else {
      setUpdateStatus('App is up to date');
    }
  };

  const manualUpdateCheck = async () => {
    const versionManager = VersionManager.getInstance();
    await versionManager.checkAndShowUpdateIfNeeded();
  };

  const showForceUpdate = async () => {
    const versionManager = VersionManager.getInstance();
    await versionManager.showUpdateDialog(
      'Update Required',
      'This is a test force update dialog.',
      true // Force update
    );
  };

  const showOptionalUpdate = async () => {
    const versionManager = VersionManager.getInstance();
    await versionManager.showUpdateDialog(
      'Update Available',
      'A new version is available with cool features!',
      false // Optional update
    );
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Version Check Example
      </Text>
      
      {versionInfo && (
        <View style={{ marginBottom: 20 }}>
          <Text>Current Version: {versionInfo.versionName}</Text>
          <Text>Version Code: {versionInfo.versionCode}</Text>
          <Text>Package: {versionInfo.packageName}</Text>
        </View>
      )}
      
      <Text style={{ marginBottom: 20 }}>Status: {updateStatus}</Text>
      
      <View style={{ gap: 10 }}>
        <Button title="Check for Updates" onPress={manualUpdateCheck} />
        <Button title="Test Force Update Dialog" onPress={showForceUpdate} />
        <Button title="Test Optional Update Dialog" onPress={showOptionalUpdate} />
      </View>
    </View>
  );
};

export default VersionCheckExample;

// Usage in your existing screens (HomeScreen, ProfileScreen, etc.):
/*

import VersionManager from '../utils/VersionManager';

// In any screen component:
const HomeScreen = () => {
  useEffect(() => {
    // Check for updates when screen loads
    const checkUpdates = async () => {
      const versionManager = VersionManager.getInstance();
      await versionManager.checkAndShowUpdateIfNeeded();
    };
    
    checkUpdates();
  }, []);

  // Your existing screen code...
};

// Or add a manual "Check for Updates" button in Settings/Profile:
const handleCheckUpdates = async () => {
  const versionManager = VersionManager.getInstance();
  const updateCheck = await versionManager.checkForUpdates();
  
  if (updateCheck?.updateRequired) {
    await versionManager.showUpdateDialog(
      'Update Available',
      updateCheck.message,
      true
    );
  } else {
    Alert.alert('No Updates', 'Your app is up to date!');
  }
};

*/
