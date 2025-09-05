import React, {useState, useContext} from 'react';
import {
  Text,
  View,
  Alert,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import auth from '@react-native-firebase/auth';
import axios from 'axios';
import UserContext from '../context/userContext';
import SessionManager from '../utils/SessionManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import NotificationService from '../components/NotificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'OTPLogin'>;

const OTPLoginScreen: React.FC<Props> = ({navigation}) => {
  const userContext = useContext(UserContext);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [isOTPVerified, setIsOTPVerified] = useState(false);

  const handleSuccessfulLogin = async (response: any) => {
    console.log('📱 OTP LOGIN - User Details:', {
      userId: response.data.userId,
      email: response.data.email,
      phoneNumber: response.data.phoneNumber,
      requiresProfile: response.data.requiresProfile,
      token: response.data.token ? 'Present' : 'Missing',
      loginMethod: 'OTP/Phone',
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

  const handleSendOTP = async () => {
    try {
      if (!phoneNumber.trim()) {
        Alert.alert('Error', 'Please enter a phone number');
        return;
      }

      const formattedPhone = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+91${phoneNumber}`;

      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      if (confirmation.verificationId) {
        setVerificationId(confirmation.verificationId);
        setIsOTPSent(true);
        Alert.alert('Success', 'OTP sent to your phone number');
      } else {
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      }
    } catch (error: any) {
      console.error('Send OTP Error:', error);
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    try {
      if (!otp.trim()) {
        Alert.alert('Error', 'Please enter OTP');
        return;
      }

      const credential = auth.PhoneAuthProvider.credential(verificationId, otp);
      await auth().signInWithCredential(credential);

      const firebaseToken = await auth().currentUser?.getIdToken();

      if (firebaseToken) {
        const response = await axios.post(
          'https://ecf63b299473.ngrok-free.app/api/user/auth/verify-firebase',
          {firebaseToken},
        );

        if (response.data.success) {
          console.log('📱 OTP VERIFICATION SUCCESS:', {
            userId: response.data.userId,
            email: response.data.email,
            phoneNumber: phoneNumber,
            hasProfile: !!response.data.profile,
            requiresProfile: response.data.requiresProfile,
            action: response.data.action,
          });

          // Handle different response actions
          if (response.data.action === 'COLLECT_MISSING_CONTACT') {
            // Need to collect missing contact info (email for OTP)
            console.log('📝 COLLECT MISSING CONTACT - NEED EMAIL:', {
              phoneNumber: phoneNumber,
              availableContacts: response.data.availableContacts,
              willAskForEmail: true,
            });
            setIsOTPVerified(true);
            setIsOTPSent(false); // Hide OTP input, show email input
          } else if (response.data.userId) {
            // User found (either with or without profile) - proceed to home
            console.log('✅ USER FOUND - PROCEEDING TO HOME:', {
              userId: response.data.userId,
              phoneNumber: phoneNumber,
              hasProfile: !!response.data.profile,
              email: response.data.email,
              action: response.data.profile
                ? 'Existing profile'
                : 'New user - show modal',
            });
            await handleSuccessfulLogin(response);
          } else {
            // This shouldn't happen, but fallback to email collection
            console.log(
              '⚠️ UNEXPECTED RESPONSE - FALLING BACK TO EMAIL COLLECTION:',
              {
                phoneNumber: phoneNumber,
                responseData: response.data,
              },
            );
            setIsOTPVerified(true);
            setIsOTPSent(false);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Verify OTP Error:', error);
      Alert.alert('Error', error.message || 'Invalid OTP');
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      // Get Firebase token for user creation
      const firebaseToken = await auth().currentUser?.getIdToken();

      if (firebaseToken) {
        // Use the new endpoint to create user with collected contacts
        const response = await axios.post(
          'https://ecf63b299473.ngrok-free.app/api/user/auth/create-user-with-contacts',
          {
            firebaseUid: auth().currentUser?.uid,
            email: email.trim(),
            phoneNumber: phoneNumber.startsWith('+')
              ? phoneNumber
              : `+91${phoneNumber}`,
          },
        );

        if (response.data.success) {
          console.log('📧 EMAIL SUBMITTED - USER CREATED:', {
            email,
            phoneNumber,
            userId: response.data.userId,
            requiresProfile: response.data.requiresProfile,
            action: 'New user created with contacts',
          });

          await handleSuccessfulLogin(response);
        }
      }
    } catch (error: any) {
      console.error('❌ Email Submit Error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create account',
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
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
            <Text style={styles.title}>PHONE VERIFICATION</Text>

            {!isOTPSent && !isOTPVerified ? (
              // Step 1: Phone number input
              <>
                <Text style={styles.subtitle}>Enter your phone number</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="grey"
                    placeholder="Phone Number (with country code)"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </View>
                <TouchableOpacity style={styles.button} onPress={handleSendOTP}>
                  <Text style={styles.buttonText}>Send OTP</Text>
                </TouchableOpacity>
              </>
            ) : isOTPSent && !isOTPVerified ? (
              // Step 2: OTP input
              <>
                <Text style={styles.subtitle}>
                  Enter the OTP sent to your phone
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="grey"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleVerifyOTP}>
                  <Text style={styles.buttonText}>Verify OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleSendOTP}>
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            ) : isOTPVerified ? (
              // Step 3: Email input for account linking (mobile not found)
              <>
                <Text style={styles.subtitle}>Complete your account setup</Text>
                <Text style={styles.emailDescription}>
                  We couldn't find an account with this mobile number. Please
                  enter your email to create or link your account.
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="grey"
                    placeholder="Enter your email address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleEmailSubmit}>
                  <Text style={styles.buttonText}>Continue</Text>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (isOTPVerified) {
                  setIsOTPVerified(false);
                  setIsOTPSent(true);
                } else if (isOTPSent) {
                  setIsOTPSent(false);
                } else {
                  navigation.goBack();
                }
              }}>
              <Text style={styles.backText}>
                {isOTPVerified ? 'Back to OTP' : 'Back to Login Options'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
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
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  input: {
    height: 50,
    color: 'black',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#00296B',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    color: '#00296B',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  backButton: {
    alignItems: 'center',
  },
  backText: {
    color: '#00296B',
    fontSize: 16,
  },
  emailDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
});

export default OTPLoginScreen;
