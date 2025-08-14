import {NativeModules, Platform, Alert} from 'react-native';

const {VersionModule} = NativeModules;

interface VersionInfo {
  versionName: string;
  versionCode: number;
  packageName: string;
}

interface UpdateCheckResult {
  updateRequired: boolean;
  message: string;
  playStoreUrl: string;
}

class VersionManager {
  private static instance: VersionManager;

  private constructor() {}

  static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager();
    }
    return VersionManager.instance;
  }

  async checkForUpdates(): Promise<UpdateCheckResult | null> {
    try {
      if (Platform.OS === 'android' && VersionModule) {
        return await VersionModule.checkForUpdates();
      }

      // For iOS, you would implement App Store version checking
      // This could use iTunes API or similar service
      console.log('Version checking not implemented for iOS');
      return null;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return null;
    }
  }

  async getCurrentVersion(): Promise<VersionInfo | null> {
    try {
      if (Platform.OS === 'android' && VersionModule) {
        return await VersionModule.getCurrentVersion();
      }

      // For iOS, you can get version from react-native-device-info
      console.log('Version info not implemented for iOS');
      return null;
    } catch (error) {
      console.error('Error getting current version:', error);
      return null;
    }
  }

  async showUpdateDialog(
    title: string,
    message: string,
    isForceUpdate: boolean = true,
  ): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && VersionModule) {
        return await VersionModule.showUpdateDialog(
          title,
          message,
          isForceUpdate,
        );
      }

      // Fallback to React Native Alert for iOS
      this.showFallbackAlert(title, message, isForceUpdate);
      return true;
    } catch (error) {
      console.error('Error showing update dialog:', error);
      this.showFallbackAlert(title, message, isForceUpdate);
      return false;
    }
  }

  private showFallbackAlert(
    title: string,
    message: string,
    isForceUpdate: boolean,
  ) {
    const buttons = [
      {
        text: 'Update Now',
        onPress: () => this.redirectToStore(),
      },
    ];

    if (!isForceUpdate) {
      buttons.unshift({
        text: 'Later',
        style: 'cancel' as const,
        onPress: () => {},
      });
    }

    Alert.alert(title, message, buttons, {
      cancelable: !isForceUpdate,
    });
  }

  async redirectToStore(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && VersionModule) {
        return await VersionModule.redirectToPlayStore();
      }

      // For iOS, redirect to App Store
      // You would use Linking.openURL with App Store URL
      console.log('Store redirect not implemented for iOS');
      return false;
    } catch (error) {
      console.error('Error redirecting to store:', error);
      return false;
    }
  }

  async checkAndShowUpdateIfNeeded(): Promise<void> {
    try {
      const updateCheck = await this.checkForUpdates();

      if (updateCheck?.updateRequired) {
        await this.showUpdateDialog(
          'Update Required',
          updateCheck.message || 'Please update the app to continue using it.',
          true, // Force update
        );
      }
    } catch (error) {
      console.error('Error in update check flow:', error);
    }
  }

  async logVersionInfo(): Promise<void> {
    try {
      const versionInfo = await this.getCurrentVersion();
      if (versionInfo) {
        console.log('App Version Info:', versionInfo);
      }
    } catch (error) {
      console.error('Error logging version info:', error);
    }
  }
}

export default VersionManager;
