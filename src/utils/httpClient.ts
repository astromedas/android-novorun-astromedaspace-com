/* eslint-disable @typescript-eslint/no-shadow */
import axios, {AxiosResponse, AxiosError} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert} from 'react-native';
import {navigateToLogin} from './navigationRef';

// Create axios instance
const httpClient = axios.create({
  baseURL: 'https://ecf63b299473.ngrok-free.app/api',
  timeout: 10000,
});

// Track if session expiry dialog is already shown to prevent multiple dialogs
let isSessionExpiredDialogShown = false;

// Response interceptor to handle session expiry
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // If response is successful, return it
    return response;
  },
  async (error: AxiosError) => {
    // Check if error is 401 (unauthorized - session expired)
    if (error.response?.status === 401) {
      // Skip session expiry check for login/register endpoints
      const url = error.config?.url || '';
      const isAuthEndpoint =
        url.includes('/user/auth/signin') ||
        url.includes('/user/auth/signup') ||
        url.includes('/auth/login') ||
        url.includes('/auth/register');

      if (!isAuthEndpoint && !isSessionExpiredDialogShown) {
        // Check if user is actually logged in (has stored credentials)
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedToken = await AsyncStorage.getItem('userToken');

        if (storedUserId && storedToken) {
          // User is logged in but getting 401, session has expired
          isSessionExpiredDialogShown = true;

          console.log(
            'Session expired detected - clearing storage and showing dialog',
          );

          // Show session expired alert first
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please login again to continue.',
            [
              {
                text: 'Login Again',
                onPress: async () => {
                  try {
                    // Clear all stored session data
                    await AsyncStorage.multiRemove([
                      'userId',
                      'userToken',
                      'email',
                    ]);

                    // Clear any other app-specific storage
                    await AsyncStorage.multiRemove([
                      'trackingState',
                      'hasCompletedOnboarding',
                      'duration',
                      'startTime',
                    ]);

                    console.log('Session cleared, navigating to login');

                    // Reset the flag
                    isSessionExpiredDialogShown = false;

                    // Navigate to login screen and clear navigation stack
                    navigateToLogin();
                    // eslint-disable-next-line no-catch-shadow
                  } catch (error) {
                    console.error('Error clearing session data:', error);
                    // Even if clearing fails, still navigate to login
                    navigateToLogin();
                    isSessionExpiredDialogShown = false;
                  }
                },
              },
            ],
            {cancelable: false},
          );
        }
      }
    }

    // Return the error for the calling code to handle
    return Promise.reject(error);
  },
);

// Request interceptor to add auth token
httpClient.interceptors.request.use(
  async config => {
    // Add authorization header if token exists
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

export default httpClient;
