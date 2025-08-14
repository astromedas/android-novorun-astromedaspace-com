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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import axios from 'axios';
import UserContext from '../context/userContext';

import messaging from '@react-native-firebase/messaging';
import NotificationService from '../components/NotificationService';
import SessionManager from '../utils/SessionManager';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const userContext = useContext(UserContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFormFilled, setIsFormFilled] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setIsFormFilled(value.trim() !== '' && password.trim() !== '');
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setIsFormFilled(email.trim() !== '' && value.trim() !== '');
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(
        'https://astro-api-okfis.ondigitalocean.app/api/user/auth/signin',
        {
          email: email,
          password: password,
        },
      );
      // console.log('after login', response.data);

      if (response.data.commonpassword === 'yes') {
        userContext?.setDefaultPassword(true);
      } else {
        userContext?.setDefaultPassword(false);
      }
      userContext?.setLoggedIn(true);
      userContext?.setUserId(response.data.userId || '');
      userContext?.setEmail(response.data.email || '');
      userContext?.setAccessToken(response.data.token);

      // Save session using SessionManager (handles both AsyncStorage and native Android)
      const sessionManager = SessionManager.getInstance();
      await sessionManager.saveLoginSession(
        response.data.userId || '',
        response.data.token,
        response.data.email || ''
      );
      // const storedUserId = await AsyncStorage.getItem('userId');
      // console.log('User ID from AsyncStorage after stored:', storedUserId);
      // console.log('User logged in:', response.data);
      const initializeNotifications = async () => {
        try {
          const token = await NotificationService.initialize();
          console.log('FCM Token initialized:', token);

          // Foreground message handler
          const unsubscribe = messaging().onMessage(
            async (remoteMessage: any) => {
              console.log('Foreground message:', remoteMessage);
              // Add your notification display logic here
            },
          );

          // Background/Quit state handler
          messaging().setBackgroundMessageHandler(
            async (remoteMessage: any) => {
              console.log('Background message:', remoteMessage);
            },
          );

          // App opened from background state
          messaging().onNotificationOpenedApp((remoteMessage: any) => {
            console.log('App opened from background:', remoteMessage);
            // Add navigation logic here
          });

          // App opened from quit state
          const initialNotification =
            await messaging().getInitialNotification();
          if (initialNotification) {
            console.log('App opened from quit state:', initialNotification);
            // Add navigation logic here
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
    } catch (error: any) {
      console.error('Login Error:', error);
      Alert.alert(
        'Login failed',
        error.response?.data?.message ||
          'An error occurred during login. Please try again.',
      );
    }
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
          <Text style={styles.subtitle}>Register to save your run.</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholderTextColor="grey"
              placeholder="Email"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholderTextColor="grey"
              placeholder="Password"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!isPasswordVisible}
            />
            <TouchableOpacity
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              style={styles.eyeIcon}>
              <Image
                source={
                  isPasswordVisible
                    ? require('../assets/eye.png')
                    : require('../assets/blind.png')
                }
                style={styles.eyeImage}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPasswordScreen')}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              {backgroundColor: isFormFilled ? '#00296B' : '#808080'},
            ]}
            onPress={handleLogin}
            disabled={!isFormFilled}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
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
    marginBottom: 20,
  },
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
