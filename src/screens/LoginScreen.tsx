/* eslint-disable react-native/no-inline-styles */
import React, {useState, useContext} from 'react';
import {
  Text,
  View,
  Alert,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import axios from 'axios';
import UserContext from '../context/userContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import messaging from '@react-native-firebase/messaging';
import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import NotificationService from '../components/NotificationService';
import SessionManager from '../utils/SessionManager';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const userContext = useContext(UserContext);
  const [authMethod, setAuthMethod] = useState<'google' | 'phone'>('google');

  const handleSuccessfulLogin = async (response: any) => {
    console.log('🔐 GOOGLE LOGIN - MOBILE-FIRST CHECK:', {
      userId: response.data.userId,
      email: response.data.email,
      phoneNumber: response.data.phoneNumber,
      hasProfile: !!response.data.profile,
      requiresProfile: response.data.requiresProfile,
      token: response.data.token ? 'Present' : 'Missing',
      loginMethod: 'Google',
      detectionMethod: response.data.profile ? 'Existing Profile' : 'New User',
    });

    userContext?.setLoggedIn(true);
    userContext?.setUserId(response.data.userId || '');
    userContext?.setEmail(response.data.email || '');
    userContext?.setAccessToken(response.data.token);

    // Save session using SessionManager
    const sessionManager = SessionManager.getInstance();
    await sessionManager.saveLoginSession(
      response.data.userId || '',
      response.data.token,
      response.data.email || '',
    );
    console.log('Login success response:', response.data);
    // Store flag for new users who need profile creation
    if (response.data.requiresProfile) {
      await AsyncStorage.setItem('requiresProfile', 'true');
    }

    // Initialize notifications
    const initializeNotifications = async () => {
      try {
        const token = await NotificationService.initialize();
        console.log('FCM Token initialized:', token);

        // Foreground message handler
        const unsubscribe = messaging().onMessage(
          async (remoteMessage: any) => {
            console.log('Foreground message:', remoteMessage);
          },
        );

        // Background/Quit state handler
        messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
          console.log('Background message:', remoteMessage);
        });

        // App opened from background state
        messaging().onNotificationOpenedApp((remoteMessage: any) => {
          console.log('App opened from background:', remoteMessage);
        });

        // App opened from quit state
        const initialNotification = await messaging().getInitialNotification();
        if (initialNotification) {
          console.log('App opened from quit state:', initialNotification);
        }

        return unsubscribe;
      } catch (error) {
        console.log('Notification initialization error:', error);
      }
    };

    initializeNotifications();
    navigation.navigate('BottomTabs', {
      screen: 'Home',
    });
  };

  const handleFirebaseAuth = async (firebaseToken: string) => {
    try {
      const SERVER_URL = 'https://ecf63b299473.ngrok-free.app';
      const response = await axios.post(
        `${SERVER_URL}/api/user/auth/verify-firebase`,
        {firebaseToken},
      );

      if (response.data.success) {
        // Handle different response actions
        if (response.data.action === 'COLLECT_MISSING_CONTACT') {
          // Need to collect missing contact info (phone for Google)
          console.log('📝 COLLECT MISSING CONTACT - NEED PHONE:', {
            email: response.data.availableContacts?.email,
            availableContacts: response.data.availableContacts,
            willAskForPhone: true,
          });

          // For Google login, we need to collect phone number
          // For now, create user without phone - they can add it later in profile
          const createResponse = await axios.post(
            'https://ecf63b299473.ngrok-free.app/api/user/auth/create-user-with-contacts',
            {
              firebaseUid: response.data.firebaseUid,
              email: response.data.availableContacts?.email,
              phoneNumber: null, // Google login doesn't have phone initially
            },
          );

          if (createResponse.data.success) {
            console.log('📧 GOOGLE USER CREATED WITHOUT PHONE:', {
              email: response.data.availableContacts?.email,
              userId: createResponse.data.userId,
              action: 'User created, can add phone later',
            });
            await handleSuccessfulLogin(createResponse);
          } else {
            await handleSuccessfulLogin(response);
          }
        } else {
          // User authenticated successfully (existing or new)
          await handleSuccessfulLogin(response);
        }
      }
    } catch (error: any) {
      console.error('Firebase Auth Error:', error);
      Alert.alert(
        'Authentication failed',
        error.response?.data?.message ||
          'An error occurred during authentication.',
      );
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error('No ID token found');
      }
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);

      const firebaseToken = await auth().currentUser?.getIdToken();
      if (firebaseToken) {
        await handleFirebaseAuth(firebaseToken);
      }
    } catch (error: any) {
      console.error('Google Login Error:', error);
      Alert.alert('Google Login Failed', error.message);
    }
  };

  const handlePhoneLogin = () => {
    navigation.navigate('OTPLogin');
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ImageBackground
        source={require('../assets/background.jpeg')}
        style={styles.background}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Image
              source={require('../assets/novoRUN_circular.png')}
              style={styles.logoImage}
            />
            <Text style={styles.title}>GET STARTED</Text>
            <Text style={styles.subtitle}>Choose your sign-in method</Text>

            {/* Authentication Method Selection */}
            <View style={styles.methodContainer}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  authMethod === 'google' && styles.selectedMethod,
                ]}
                onPress={() => setAuthMethod('google')}>
                <Text
                  style={[
                    styles.methodText,
                    authMethod === 'google' && styles.selectedMethodText,
                  ]}>
                  Google
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  authMethod === 'phone' && styles.selectedMethod,
                ]}
                onPress={() => setAuthMethod('phone')}>
                <Text
                  style={[
                    styles.methodText,
                    authMethod === 'phone' && styles.selectedMethodText,
                  ]}>
                  Phone
                </Text>
              </TouchableOpacity>
            </View>

            {/* Authentication Buttons */}
            {authMethod === 'google' && (
              <TouchableOpacity
                style={styles.authButton}
                onPress={handleGoogleLogin}>
                <Text style={styles.authButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            )}

            {authMethod === 'phone' && (
              <TouchableOpacity
                style={styles.authButton}
                onPress={handlePhoneLogin}>
                <Text style={styles.authButtonText}>Continue with Phone</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(35, 35, 35, 0.03)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
  },
  logoImage: {
    width: 70,
    height: 70,
    marginBottom: 5,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    borderRadius: 50,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#00296B',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#00296B',
    marginBottom: 30,
  },
  methodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  methodButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#00296B',
    backgroundColor: 'transparent',
  },
  selectedMethod: {
    backgroundColor: '#00296B',
  },
  selectedMethodText: {
    color: 'white',
  },
  methodText: {
    color: '#00296B',
    fontSize: 16,
    fontWeight: '600',
  },
  authButton: {
    backgroundColor: '#00296B',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Legacy styles (keeping for backward compatibility)
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: 'black',
  },
  eyeIcon: {
    padding: 8,
  },
  eyeImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  button: {
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordText: {
    color: '#00296B',
    marginLeft: 10,
    fontSize: 14,
    textDecorationLine: 'underline',
    marginBottom: 15,
  },
});

export default LoginScreen;
