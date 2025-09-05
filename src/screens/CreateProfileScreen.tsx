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
  ScrollView,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import axios from 'axios';
import UserContext from '../context/userContext';
import SessionManager from '../utils/SessionManager';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateProfile'>;

const CreateProfileScreen: React.FC<Props> = ({navigation, route}) => {
  const {firebaseData} = route.params;
  const userContext = useContext(UserContext);

  const [profileData, setProfileData] = useState({
    fullName: '',
    mobile: '',
    age: '',
    height: '',
    weight: '',
    gender: '',
    city: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateProfile = async () => {
    if (
      !profileData.fullName.trim() ||
      !profileData.mobile.trim() ||
      !profileData.age.trim()
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        'https://ecf63b299473.ngrok-free.app/api/user/auth/create-profile',
        {
          firebaseUid: firebaseData.uid,
          email: firebaseData.email,
          phoneNumber: firebaseData.phoneNumber,
          profileData,
        },
      );

      if (response.data.success) {
        // Update context with user data
        userContext?.setLoggedIn(true);
        userContext?.setUserId(response.data.userId);
        userContext?.setEmail(response.data.email);
        userContext?.setAccessToken(response.data.token);

        // Save session
        const sessionManager = SessionManager.getInstance();
        await sessionManager.saveLoginSession(
          response.data.userId,
          response.data.token,
          response.data.email || '',
        );

        // Navigate to home
        navigation.navigate('BottomTabs', {screen: 'Home'});
      }
    } catch (error: any) {
      console.error('Create Profile Error:', error);
      Alert.alert(
        'Profile Creation Failed',
        error.response?.data?.message ||
          'An error occurred while creating your profile.',
      );
    } finally {
      setIsLoading(false);
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
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
              <Image
                source={require('../assets/novoRUN_circular.png')}
                style={styles.logoImage}
              />
              <Text style={styles.title}>CREATE YOUR PROFILE</Text>
              <Text style={styles.subtitle}>
                Tell us a bit about yourself to get started
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="grey"
                  placeholder="Full Name *"
                  value={profileData.fullName}
                  onChangeText={value => handleInputChange('fullName', value)}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="grey"
                  placeholder="Mobile *"
                  value={profileData.mobile}
                  onChangeText={value => handleInputChange('mobile', value)}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="grey"
                  placeholder="Age *"
                  value={profileData.age}
                  onChangeText={value => handleInputChange('age', value)}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="grey"
                  placeholder="Height (cm)"
                  value={profileData.height}
                  onChangeText={value => handleInputChange('height', value)}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="grey"
                  placeholder="Weight (kg)"
                  value={profileData.weight}
                  onChangeText={value => handleInputChange('weight', value)}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="grey"
                  placeholder="Gender"
                  value={profileData.gender}
                  onChangeText={value => handleInputChange('gender', value)}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholderTextColor="grey"
                  placeholder="City"
                  value={profileData.city}
                  onChangeText={value => handleInputChange('city', value)}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleCreateProfile}
                disabled={isLoading}>
                <Text style={styles.buttonText}>
                  {isLoading ? 'Creating Profile...' : 'Create Profile'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    marginTop: 'auto',
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
    marginBottom: 15,
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
  buttonDisabled: {
    backgroundColor: '#808080',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
  },
  backText: {
    color: '#00296B',
    fontSize: 16,
  },
});

export default CreateProfileScreen;
