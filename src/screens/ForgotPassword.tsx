import React, {useState} from 'react';
import {
  View,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import axios from 'axios';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import {useNavigation} from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordScreen'>;

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<Props['navigation']>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  // Step 1: Enter email and phone
  // Step 2: Enter new password

  const validateEmailAndPhone = async () => {
    if (!email || !phoneNumber) {
      Alert.alert('Error', 'Please enter both email and phone number');
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+91')
        ? phoneNumber
        : `${phoneNumber}`;
      // Validate email and phone with server
      const response = await axios.post(
        'https://astro-api-okfis.ondigitalocean.app/api/user/auth/pm',
        {
          email,
          phoneNumber: formattedPhone,
        },
      );

      if (response.status === 200) {
        setCurrentStep(2);
      } else {
        Alert.alert('Error', 'Email or phone number not found');
      }
    } catch (error: any) {
      Alert.alert('Error', error.error || 'Failed to verify details');
      console.log('error verify', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.put(
        'https://astro-api-okfis.ondigitalocean.app/api/user/auth/updatemail',
        {
          email,
          newPassword,
        },
      );

      if (response.status === 200) {
        Alert.alert('Success', 'Password updated successfully');
        navigation.navigate('Login');
      } else {
        throw new Error('Failed to update password');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        <View style={[styles.step, currentStep >= 1 && styles.activeStep]}>
          <Text
            style={[
              styles.stepText,
              currentStep >= 1 && styles.activeStepText,
            ]}>
            1
          </Text>
        </View>
        <View style={styles.stepLine} />
        <View style={[styles.step, currentStep >= 2 && styles.activeStep]}>
          <Text
            style={[
              styles.stepText,
              currentStep >= 2 && styles.activeStepText,
            ]}>
            2
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      {/* <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        accessibilityLabel="Go back"
        accessibilityRole="button">
        <Text style={styles.backButtonText}>&lt;-- Back</Text>
      </TouchableOpacity> */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {isLoading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#00296B" />
            <Text style={styles.loadingText}>Processing your request...</Text>
          </View>
        )}

        <Text style={styles.title}>Forgot Password</Text>
        {renderStepIndicator()}

        {currentStep === 1 && (
          <>
            <Text style={styles.subtitle}>
              Enter your email and phone number to continue
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholderTextColor="#666"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Phone Number (e.g., 1234567890)"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholderTextColor="#666"
              />
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={validateEmailAndPhone}
              disabled={isLoading}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

        {currentStep === 2 && (
          <View style={styles.passwordContainer}>
            <Text style={styles.subtitle}>Enter your new password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!isNewPasswordVisible}
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                onPress={() => setIsNewPasswordVisible(!isNewPasswordVisible)}
                style={styles.eyeIcon}>
                <Image
                  source={
                    isNewPasswordVisible
                      ? require('../assets/eye.png')
                      : require('../assets/blind.png')
                  }
                  style={styles.eyeImage}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={handleResetPassword}
              disabled={isLoading}>
              <Text style={styles.buttonText}>Reset Password</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00296B',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    width: '60%',
  },
  step: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStep: {
    backgroundColor: '#00296B',
  },
  stepText: {
    color: '#666',
    fontWeight: 'bold',
  },
  activeStepText: {
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    height: 50,
    color: '#333',
    fontSize: 16,
    flex: 1,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#00296B',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordContainer: {
    width: '100%',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    color: '#333',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  eyeImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    // backgroundColor: '#fff',
    borderRadius: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF', // iOS blue for consistency
  },
});

export default ForgotPasswordScreen;
