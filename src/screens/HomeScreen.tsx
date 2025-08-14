import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ImageBackground,
  Text,
  Platform,
  Image,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import UpcomingEventsPage from '../components/UpcomingEvents';
import StepsAndMap from '../components/StepsAndMap';
import UserCard from '../components/userCard';
import UserContext from '../context/userContext';
import axios from 'axios';
import {useFocusEffect} from '@react-navigation/native';
import CityAutocomplete from '../components/CityAutocomplete';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const user = useContext(UserContext);
  const [showHome, setShowHome] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [resetPassword, setResetPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] =
    useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  // Profile creation states
  const [profileStep, setProfileStep] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('Male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State for city autocomplete
  const [cityModalVisible, setCityModalVisible] = useState(false);

  const onboardingCards = [
    {
      title: 'Welcome to Novo Run',
      content: 'Discover the amazing features we have for you.',
    },
    {
      title: 'The Greatest wealth is Health',
      content: 'Our First Preference is your Health.',
    },
  ];

  useEffect(() => {
    const checkReset = async () => {
      try {
        const response = await axios.get(
          `https://astro-api-okfis.ondigitalocean.app/api/user/auth/is?userId=${user?.userId}`,
          {
            headers: {
              Authorization: `Bearer ${user?.accessToken}`,
            },
          },
        );
        if (response.data && typeof response.data.passwordReset === 'boolean') {
          setResetPassword(!response.data.passwordReset);
        }
      } catch (error) {
        console.log('Error fetching reset status:', error);
      }
    };
    checkReset();
  }, [user?.userId, user?.accessToken]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.picture !== null) {
        setShowHome(true);
      }
      const fetchUserDetails = async () => {
        try {
          const response = await axios.get(
            `https://astro-api-okfis.ondigitalocean.app/api/user/profile/check?userId=${user?.userId}`,
            {
              headers: {
                Authorization: `Bearer ${user?.accessToken}`,
              },
            },
          );
          if (response.status === 200) {
            setShowHome(true);
            user?.setPicture(response.data.profilePic.image);
            user?.setName(response.data.profile.fullName);
            user?.setWeight(response.data.profile.weight);
            user?.setGender(response.data.profile.gender);
            
            // Save weight to AsyncStorage for tracking calculations after app restart
            if (response.data.profile.weight) {
              await AsyncStorage.setItem('userWeight', response.data.profile.weight.toString());
            }
          }
        } catch (error: any) {
          if (error.response && error.response.status === 404) {
            setShowHome(false);
          }
        }
      };
      fetchUserDetails();
      return () => {};
    }, [user]),
  );

  const validatePassword = (): boolean => {
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const resetPasswordHandler = async () => {
    if (!validatePassword()) {
      return;
    }
    try {
      const response = await axios.put(
        'https://astro-api-okfis.ondigitalocean.app/api/user/auth/ups',
        {
          userId: user?.userId,
          currentPassword: currentPassword,
          newPassword: password,
        },
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        },
      );
      if (response.status === 200) {
        setResetPassword(false);
        setCurrentCard(0);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message);
    }
  };

  const handleNext = () => {
    if (currentCard < onboardingCards.length - 1) {
      setCurrentCard(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentCard > 0) {
      setCurrentCard(prev => prev - 1);
    }
  };

  const handleRedirectToProfile = () => {
    setShowProfileModal(true);
  };

  const validateProfileStep = (): boolean => {
    if (profileStep === 0) {
      if (!fullName.trim()) {
        Alert.alert('Error', 'Please enter your full name');
        return false;
      }
      return true;
    } else if (profileStep === 1) {
      if (!height.trim() || isNaN(Number(height)) || Number(height) <= 0) {
        Alert.alert('Error', 'Please enter a valid height');
        return false;
      }
      if (!weight.trim() || isNaN(Number(weight)) || Number(weight) <= 0) {
        Alert.alert('Error', 'Please enter a valid weight');
        return false;
      }
      if (!age.trim() || isNaN(Number(age)) || Number(age) <= 0) {
        Alert.alert('Error', 'Please enter a valid age');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleProfileNext = () => {
    if (validateProfileStep()) {
      if (profileStep < 2) {
        setProfileStep(profileStep + 1);
      } else {
        handleProfileSubmit();
      }
    }
  };

  const handleProfilePrevious = () => {
    if (profileStep > 0) {
      setProfileStep(profileStep - 1);
    }
  };

  const handleProfileSubmit = async () => {
    if (!mobile.trim() || !/^\d{10}$/.test(mobile)) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Error', 'Please select your city');
      return;
    }
    setIsSubmitting(true);
    const profileData = {
      userId: user?.userId,
      email: user?.email || '',
      fullName,
      gender,
      height: parseFloat(height),
      weight: parseFloat(weight),
      age: parseInt(age, 10),
      mobile,
      city,
    };
    try {
      const response = await axios.post(
        'https://astro-api-okfis.ondigitalocean.app/api/user/profile/create',
        profileData,
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        },
      );
      if (response.status === 201) {
        user?.setName(response.data.profile?.fullName);
        user?.setWeight(response.data.profile?.weight);
        user?.setGender(response.data.profile?.gender);
        setShowProfileModal(false);
        setShowHome(true);
        
        // Save weight to AsyncStorage for tracking calculations after app restart
        if (response.data.profile?.weight) {
          await AsyncStorage.setItem('userWeight', response.data.profile.weight.toString());
        }
        
        Alert.alert('Success', 'Profile created successfully!');
      }
    } catch (error) {
      console.error('Profile creation error:', error);
      Alert.alert(
        'Error',
        'An error occurred while creating your profile. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle city selection
  const handleOpenCityModal = () => {
    setCityModalVisible(true);
  };

  const renderProfileStep = () => {
    switch (profileStep) {
      case 0:
        return (
          <View style={styles.profileStepContainer}>
            <View style={styles.iconHeaderContainer}>
              <Image
                source={require('../assets/user.png')}
                style={styles.stepIcon}
              />
              <Text style={styles.profileStepTitle}>Personal Info</Text>
            </View>
            <Text style={styles.stepDescription}>
              Let's start with your basic information
            </Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.profileInput}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={gender}
                  style={styles.picker}
                  onValueChange={itemValue => setGender(itemValue)}>
                  <Picker.Item label="Male" value="Male" />
                  <Picker.Item label="Female" value="Female" />
                  <Picker.Item label="Other" value="Other" />
                </Picker>
              </View>
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.profileStepContainer}>
            <View style={styles.iconHeaderContainer}>
              <Image
                source={require('../assets/performance-boost.png')}
                style={styles.stepIcon}
              />
              <Text style={styles.profileStepTitle}>Body Metrics</Text>
            </View>
            <Text style={styles.stepDescription}>
              This helps us personalize your fitness journey
            </Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.profileInput}
                placeholder="Enter your height"
                placeholderTextColor="#999"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.profileInput}
                placeholder="Enter your weight"
                placeholderTextColor="#999"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.profileInput}
                placeholder="Enter your age"
                placeholderTextColor="#999"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.profileStepContainer}>
            <View style={styles.iconHeaderContainer}>
              <Image
                source={require('../assets/contact.png')}
                style={styles.stepIcon}
              />
              <Text style={styles.profileStepTitle}>Contact Details</Text>
            </View>
            <Text style={styles.stepDescription}>How can we reach you?</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <TextInput
                style={styles.profileInput}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#999"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>City</Text>
              <TouchableOpacity
                style={styles.cityInputButton}
                onPress={handleOpenCityModal}>
                <Text
                  style={
                    city ? styles.cityInputText : styles.cityInputPlaceholder
                  }>
                  {city || 'Select your city'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  if (resetPassword) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlayContainer}>
        <ImageBackground
          source={require('../assets/background.jpeg')}
          style={styles.overlayBackground}
          resizeMode="cover">
          <View style={styles.resetPasswordContainer}>
            <View style={styles.resetPasswordCard}>
              <Text style={styles.resetPasswordTitle}>Change Password</Text>
              <Text style={styles.resetPasswordSubtitle}>
                Please set a new password for your account
              </Text>

              <View style={styles.passwordInputContainer}>
                <TextInput
                  placeholder="Enter Given password"
                  placeholderTextColor="#999"
                  secureTextEntry={!isCurrentPasswordVisible}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  onPress={() =>
                    setIsCurrentPasswordVisible(!isCurrentPasswordVisible)
                  }
                  style={styles.passwordEyeIcon}>
                  <Image
                    source={
                      isCurrentPasswordVisible
                        ? require('../assets/eye.png')
                        : require('../assets/blind.png')
                    }
                    style={styles.passwordEyeImage}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordInputContainer}>
                <TextInput
                  placeholder="Enter new password"
                  placeholderTextColor="#999"
                  secureTextEntry={!isNewPasswordVisible}
                  value={password}
                  onChangeText={setPassword}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  onPress={() => setIsNewPasswordVisible(!isNewPasswordVisible)}
                  style={styles.passwordEyeIcon}>
                  <Image
                    source={
                      isNewPasswordVisible
                        ? require('../assets/eye.png')
                        : require('../assets/blind.png')
                    }
                    style={styles.passwordEyeImage}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordInputContainer}>
                <TextInput
                  placeholder="Confirm new password"
                  placeholderTextColor="#999"
                  secureTextEntry={!isConfirmPasswordVisible}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  onPress={() =>
                    setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
                  }
                  style={styles.passwordEyeIcon}>
                  <Image
                    source={
                      isConfirmPasswordVisible
                        ? require('../assets/eye.png')
                        : require('../assets/blind.png')
                    }
                    style={styles.passwordEyeImage}
                  />
                </TouchableOpacity>
              </View>

              {errorMessage ? (
                <Text style={styles.resetPasswordError}>{errorMessage}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.resetPasswordButton}
                onPress={resetPasswordHandler}>
                <Text style={styles.resetPasswordButtonText}>
                  Change Password
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </KeyboardAvoidingView>
    );
  }

  if (!showHome) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require('../assets/background.jpeg')}
          style={styles.background}>
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.title}>
                {onboardingCards[currentCard].title}
              </Text>
              <Text style={styles.content}>
                {onboardingCards[currentCard].content}
              </Text>
              <View style={styles.dotsContainer}>
                {onboardingCards.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === currentCard && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
              <View style={styles.buttonContainer}>
                {currentCard > 0 && (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={handlePrevious}>
                    <Image
                      source={require('../assets/left-arrow.png')}
                      style={styles.buttonIcon}
                    />
                  </TouchableOpacity>
                )}
                {currentCard < onboardingCards.length - 1 ? (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={handleNext}>
                    <Image
                      source={require('../assets/next.png')}
                      style={styles.buttonIcon}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={handleRedirectToProfile}>
                    <Image
                      source={require('../assets/next.png')}
                      style={styles.buttonIcon}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </ImageBackground>
        {/* Profile Creation Modal */}
        <Modal
          visible={showProfileModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowProfileModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Create Your Profile</Text>
                  <View style={styles.progressContainer}>
                    {[0, 1, 2].map(step => (
                      <View
                        key={step}
                        style={[
                          styles.progressStep,
                          profileStep >= step && styles.activeProgressStep,
                        ]}
                      />
                    ))}
                  </View>
                </View>
                <ScrollView style={styles.modalScrollView}>
                  {renderProfileStep()}
                </ScrollView>
                <View style={styles.modalFooter}>
                  {profileStep > 0 && (
                    <TouchableOpacity
                      style={styles.iconFooterButton}
                      onPress={handleProfilePrevious}
                      disabled={isSubmitting}>
                      <Image
                        source={require('../assets/left-arrow.png')}
                        style={styles.footerButtonIcon}
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.iconFooterButton,
                      isSubmitting && styles.disabledButton,
                    ]}
                    onPress={handleProfileNext}
                    disabled={isSubmitting}>
                    {profileStep === 2 ? (
                      isSubmitting ? (
                        <Text style={styles.footerButtonText}>
                          Submitting...
                        </Text>
                      ) : (
                        <Image
                          source={require('../assets/sendicon.png')}
                          style={styles.footerButtonIcon}
                        />
                      )
                    ) : (
                      <Image
                        source={require('../assets/next.png')}
                        style={styles.footerButtonIcon}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
          {/* City Selection Modal */}
          <Modal
            visible={cityModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setCityModalVisible(false)}>
            <View style={styles.cityModalContainer}>
              <View style={styles.cityModalContent}>
                <View style={styles.cityModalHeader}>
                  <Text style={styles.cityModalTitle}>Select Your City</Text>
                  <TouchableOpacity
                    onPress={() => setCityModalVisible(false)}
                    style={styles.closeIconButton}>
                    <Image
                      source={require('../assets/sendicon.png')}
                      style={styles.closeIcon}
                    />
                  </TouchableOpacity>
                </View>
                <CityAutocomplete
                  onSelectCity={selectedCity => {
                    setCity(selectedCity);
                    setCityModalVisible(false);
                  }}
                  initialCity={city}
                />
              </View>
            </View>
          </Modal>
        </Modal>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.homeContainer}>
      <UserCard />
      <View style={styles.contentContainer}>
        <StepsAndMap />
        <UpcomingEventsPage />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  content: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#007bff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  iconButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 50,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  buttonIcon: {
    width: 24,
    height: 24,
    tintColor: 'white',
  },
  homeContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 25,
  },
  contentContainer: {
    flex: 1,
    padding: 10,
  },
  overlayContainer: {
    flex: 1,
  },
  overlayBackground: {
    flex: 1,
    justifyContent: 'center',
  },
  resetPasswordContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resetPasswordCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  resetPasswordTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  resetPasswordSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
  },
  passwordInputContainer: {
    width: '100%',
    marginBottom: 20,
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  passwordEyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  passwordEyeImage: {
    width: 24,
    height: 24,
    tintColor: '#666',
  },
  resetPasswordError: {
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
  },
  resetPasswordButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  resetPasswordButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginHorizontal: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '80%',
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  activeProgressStep: {
    backgroundColor: '#007bff',
  },
  modalScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  profileStepContainer: {
    padding: 20,
  },
  iconHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  profileStepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    fontWeight: '500',
  },
  profileInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  iconFooterButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 50,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  footerButtonIcon: {
    width: 20,
    height: 20,
    tintColor: 'white',
  },
  footerButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#aaa',
  },
  cityInputButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityInputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  cityInputPlaceholder: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  arrowIcon: {
    width: 16,
    height: 16,
    tintColor: '#666',
  },
  cityModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cityModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  cityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cityModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeIconButton: {
    padding: 5,
  },
  closeIcon: {
    width: 20,
    height: 20,
    tintColor: '#333',
  },
});

export default HomeScreen;
