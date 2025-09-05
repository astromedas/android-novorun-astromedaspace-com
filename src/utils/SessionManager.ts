import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SessionModule } = NativeModules;

class SessionManager {
  private static instance: SessionManager;
  private sessionExpiredListener: any = null;

  private constructor() {
    this.setupSessionExpiredListener();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private setupSessionExpiredListener() {
    if (Platform.OS === 'android') {
      this.sessionExpiredListener = DeviceEventEmitter.addListener(
        'sessionExpired',
        this.handleSessionExpired.bind(this)
      );
    }
  }

  private async handleSessionExpired() {
    console.log('Session expired event received from native Android');

    // Clear AsyncStorage to match native storage clearing
    try {
      await AsyncStorage.multiRemove(['userId', 'userToken', 'email']);
      console.log('AsyncStorage cleared due to session expiry');
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }

    // Navigation will be handled by the main app when it detects cleared storage
    // This ensures consistency with existing React Native flow
  }

  async saveLoginSession(userId: string, token: string, email: string): Promise<boolean> {
    try {
      // Save to AsyncStorage (React Native)
      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('email', email);

      // Save to native Android SharedPreferences
      if (Platform.OS === 'android' && SessionModule) {
        await SessionModule.saveLoginSession(userId, token, email);
      }

      return true;
    } catch (error) {
      console.error('Error saving login session:', error);
      return false;
    }
  }

  async isSessionValid(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && SessionModule) {
        return await SessionModule.isSessionValid();
      }

      // Fallback for iOS or if native module not available
      const userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('userToken');
      return !!(userId && token);
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  async clearSession(): Promise<boolean> {
    try {
      // Clear AsyncStorage
      await AsyncStorage.multiRemove(['userId', 'userToken', 'email']);

      // Clear native Android SharedPreferences
      if (Platform.OS === 'android' && SessionModule) {
        await SessionModule.clearSession();
      }

      return true;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  }

  async getSessionInfo(): Promise<any> {
    try {
      if (Platform.OS === 'android' && SessionModule) {
        return await SessionModule.getSessionInfo();
      }

      // Fallback for iOS
      const userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('userToken');
      const email = await AsyncStorage.getItem('email');

      return {
        isLoggedIn: !!(userId && token),
        isValid: !!(userId && token),
        userId,
        token,
        email,
        sessionAgeInDays: 0, // Can't calculate without login timestamp on iOS
      };
    } catch (error) {
      console.error('Error getting session info:', error);
      return null;
    }
  }

  destroy() {
    if (this.sessionExpiredListener) {
      this.sessionExpiredListener.remove();
      this.sessionExpiredListener = null;
    }
  }
}

export default SessionManager;
