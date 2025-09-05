import React, {useContext, useState} from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const user = useContext(UserContext);
  const [showHome, setShowHome] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
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

  useFocusEffect(
    React.useCallback(() => {
      if (user?.picture !== null) {
        setShowHome(true);
      }
      const fetchUserDetails = async () => {
        try {
          const response = await axios.get(
            `https://ecf63b299473.ngrok-free.app/api/user/profile/check?userId=${user?.userId}`,
            {
              headers: {
                Authorization: `Bearer ${user?.accessToken}`,
              },
            },
          );
          if (response.status === 200) {
            console.log('✅ USER PROFILE FOUND:', {
              userId: user?.userId,
              hasProfile: true,
              fullName: response.data.profile.fullName,
              email: response.data.profile.email,
            });

            setShowHome(true);
            // Safely handle profile picture (may be null)
            if (response.data.profilePic && response.data.profilePic.image) {
              user?.setPicture(response.data.profilePic.image);
            } else {
              user?.setPicture(undefined); // Set to undefined if no profile picture
            }
            user?.setName(response.data.profile.fullName);
            user?.setWeight(response.data.profile.weight);
            user?.setGender(response.data.profile.gender);
          }
        } catch (error: any) {
          if (error.response && error.response.status === 404) {
            // Check if this is a new user who needs profile creation
            const requiresProfile = await AsyncStorage.getItem(
              'requiresProfile',
            );
            if (requiresProfile === 'true') {
              console.log('🆕 NEW USER DETECTED - SHOWING PROFILE MODAL:', {
                userId: user?.userId,
                email: user?.email,
                requiresProfile: true,
              });

              setShowProfileModal(true);
              await AsyncStorage.removeItem('requiresProfile');
            } else {
              console.log(
                'ℹ️ USER EXISTS BUT NO PROFILE - POSSIBLE ACCOUNT LINKING:',
                {
                  userId: user?.userId,
                  email: user?.email,
                  error: 'Profile not found',
                },
              );
            }
            setShowHome(false);
          } else {
            console.error('❌ PROFILE FETCH ERROR:', error);
          }
        }
      };
      fetchUserDetails();
      return () => {};
    }, [user]),
  );

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

    // Validate required fields
    if (!user?.userId) {
      Alert.alert('Error', 'User ID is missing. Please try logging in again.');
      return;
    }
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setIsSubmitting(true);
    const profileData = {
      userId: user?.userId,
      email: user?.email || '',
      fullName: fullName.trim(),
      gender,
      height: parseFloat(height) || null,
      weight: parseFloat(weight) || null,
      age: parseInt(age, 10) || null,
      mobile: mobile.trim(),
      city: city.trim(),
    };
    console.log('📝 CREATING PROFILE - Data:', profileData); // Debug log

    try {
      const response = await axios.post(
        'https://ecf63b299473.ngrok-free.app/api/user/profile/create',
        profileData,
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        },
      );
      if (response.status === 201) {
        console.log('✅ PROFILE CREATED SUCCESSFULLY:', {
          userId: profileData.userId,
          fullName: profileData.fullName,
          profileId: response.data.profile?.id,
          createdAt: new Date().toISOString(),
        });

        user?.setName(response.data.profile?.fullName);
        user?.setWeight(response.data.profile?.weight);
        user?.setGender(response.data.profile?.gender);
        setShowProfileModal(false);
        setShowHome(true);

        Alert.alert('Success', 'Profile created successfully!');
      }
    } catch (error: any) {
      console.error('Profile creation error:', error);
      console.error('Error response:', error.response?.data); // More detailed error
      Alert.alert(
        'Error',
        error.response?.data?.message ||
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
                  <Text style={styles.modalTitle}>
                    {user?.email
                      ? 'Complete Your Profile'
                      : 'Create Your Profile'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {user?.email
                      ? 'We found your account! Just complete your profile details.'
                      : "Let's set up your profile to get started."}
                  </Text>
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
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
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
