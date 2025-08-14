import React, {useContext, useEffect, useState} from 'react';
import {
  Image,
  ImageBackground,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import UserContext from '../context/userContext';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import UserCard from '../components/userCard';
import axios from 'axios';

type NavigationProps = NativeStackNavigationProp<
  RootStackParamList,
  'EventScreen'
>;

export default function EventModeScreen() {
  const user = useContext(UserContext);
  const navi = useNavigation<NavigationProps>();
  const [showHome, setShowHome] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
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
        // console.log('Reset request', response.data);

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
      // console.log('otha called', user?.isDefaultPassword);

      if (user?.picture !== null) {
        setShowHome(true);
      }
      const fetchUserDetails = async () => {
        console.log('otha ulla called');

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
            // console.log('hchshjdhchjshcsd', response.data);hello
            setShowHome(true);
            user?.setPicture(response.data.profilePic.image);
            // console.log('hello gender', response.data.profile.gender);
            user?.setName(response.data.profile.fullName);
            user?.setWeight(response.data.profile.weight);
            user?.setGender(response.data.profile.gender);

            // console.log('hello setted gender', user?.gender);
          }
        } catch (error: any) {
          if (error.response && error.response.status === 404) {
            setShowHome(false);
          }
        }
      };

      fetchUserDetails();
      return () => {
        console.log('Screen unfocused');
      };
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
      console.log('ommala ');
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
        // console.log('kandara oli', response.data);
        setResetPassword(false);
        setCurrentCard(0);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message);
      // console.log('othaaaa', error);
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
    setShowOverlay(true);
  };

  const closeOverlay = () => {
    setShowOverlay(false);
    navi.navigate('BottomTabs', {
      screen: 'Profile',
      params: {
        isFirstTime: true,
      },
    } as const);
  };

  const handleSelection = (mode: string) => {
    if (user?.setInsideOutside) {
      user.setInsideOutside(mode);
      navi.navigate('BottomTabs', {
        screen: 'Home',
      });
    }
  };
  if (resetPassword) {
    return (
      <View style={styles.overlayContainer}>
        <ImageBackground
          source={require('../assets/background.jpeg')}
          style={styles.overlayBackground}>
          <View style={styles.cardContainer}>
            <Text style={styles.title}>Change Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Enter Given password"
                placeholderTextColor="grey"
                secureTextEntry={!isCurrentPasswordVisible}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() =>
                  setIsCurrentPasswordVisible(!isCurrentPasswordVisible)
                }
                style={styles.eyeIcon}>
                <Image
                  source={
                    isCurrentPasswordVisible
                      ? require('../assets/eye.png')
                      : require('../assets/blind.png')
                  }
                  style={styles.eyeImage}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Enter new password"
                placeholderTextColor="grey"
                secureTextEntry={!isNewPasswordVisible}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
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

            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Confirm new password"
                placeholderTextColor="grey"
                secureTextEntry={!isConfirmPasswordVisible}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() =>
                  setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
                }
                style={styles.eyeIcon}>
                <Image
                  source={
                    isConfirmPasswordVisible
                      ? require('../assets/eye.png')
                      : require('../assets/blind.png')
                  }
                  style={styles.eyeImage}
                />
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <Text style={styles.error}>{errorMessage}</Text>
            ) : null}
            <TouchableOpacity
              onPress={resetPasswordHandler}
              style={styles.resetButton}>
              <Text style={styles.resetButtonText}>Reset Password</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }
  if (showHome) {
    return (
      <View style={styles.container}>
        <View style={styles.usercard}>
          <UserCard />
        </View>

        <View style={styles.modeContainer}>
          <TouchableOpacity onPress={() => handleSelection('DEFAULT')}>
            <View style={styles.imageWrapper}>
              <ImageBackground
                source={require('../assets/insidemanayata.png')}
                style={styles.imageBackground}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleSelection('OWN')}>
            <View style={styles.imageWrapper}>
              <ImageBackground
                source={require('../assets/outsidemanayata.png')}
                style={styles.imageBackground}
              />
            </View>
          </TouchableOpacity>
        </View>

        <Image source={require('../assets/Group219.png')} style={styles.logo} />
      </View>
    );
  }
  return (
    <View style={styles.overlayContainer}>
      <ImageBackground
        source={require('../assets/background.jpeg')}
        style={styles.overlayBackground}>
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>
              {onboardingCards[currentCard].title}
            </Text>
            <Text style={styles.content}>
              {onboardingCards[currentCard].content}
            </Text>
            <View style={styles.navigation}>
              {currentCard > 0 && (
                <TouchableOpacity
                  onPress={handlePrevious}
                  style={styles.navButton}>
                  <Text style={styles.navButtonText}>Previous</Text>
                </TouchableOpacity>
              )}
              {currentCard < onboardingCards.length - 1 ? (
                <TouchableOpacity onPress={handleNext} style={styles.navButton}>
                  <Text style={styles.navButtonText}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleRedirectToProfile}
                  style={styles.navButton}>
                  <Text style={styles.navButtonText}>Next</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {currentCard <= onboardingCards.length && (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showOverlay}
            onRequestClose={closeOverlay}>
            <View style={styles.modalOverlayContainer}>
              <View style={styles.overlayContent}>
                <Text style={styles.overlayText}>
                  Complete your profile with the edit option to continue.
                </Text>
                <TouchableOpacity
                  onPress={closeOverlay}
                  style={styles.overlayButton}>
                  <Text style={styles.overlayButtonText}>Okay</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: '5%', // Use percentage instead of fixed padding
  },
  usercard: {
    marginBottom: '4%',
  },
  modeContainer: {
    flex: 1,
  },
  imageWrapper: {
    height: '35%',
    minHeight: 135,
    maxHeight: 180,
    marginTop: '5%',
    borderRadius: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  imageBackground: {
    flex: 1,
    borderRadius: 15,
    resizeMode: 'cover',
  },
  logo: {
    width: '35%', // Percentage of screen width
    height: undefined,
    aspectRatio: 1.625, // 130/80 aspect ratio
    alignSelf: 'center',
    marginBottom: '8%',
  },
  overlayContainer: {
    flex: 1,
  },
  overlayBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#f9f9f9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: '5%',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: {width: 0, height: -2},
    shadowRadius: 4,
  },
  card: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 22 : 20,
    fontWeight: 'bold',
    marginBottom: '3%',
    textAlign: 'center',
    color: 'grey',
  },
  content: {
    fontSize: Platform.OS === 'ios' ? 18 : 16,
    textAlign: 'center',
    color: 'black',
    paddingHorizontal: '4%',
  },
  navigation: {
    marginTop: '6%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: '2%',
  },
  navButton: {
    backgroundColor: '#001965',
    paddingVertical: '3%',
    paddingHorizontal: '6%',
    borderRadius: 10,
    minWidth: '30%',
  },
  navButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? 18 : 16,
    textAlign: 'center',
  },
  modalOverlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '5%',
  },
  overlayContent: {
    width: '90%',
    padding: '5%',
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  overlayText: {
    fontSize: Platform.OS === 'ios' ? 20 : 18,
    marginBottom: '5%',
    textAlign: 'center',
    color: 'black',
  },
  overlayButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: '3%',
    paddingHorizontal: '8%',
    borderRadius: 5,
    minWidth: '40%',
  },
  overlayButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? 18 : 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: '3%',
    paddingHorizontal: '3%',
    width: '100%',
  },
  input: {
    flex: 1,
    height: 50,
    color: 'black',
    fontSize: Platform.OS === 'ios' ? 18 : 16,
  },
  eyeIcon: {
    padding: '2%',
  },
  eyeImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  error: {
    color: 'red',
    marginBottom: '3%',
    textAlign: 'center',
    fontSize: Platform.OS === 'ios' ? 16 : 14,
  },
  resetButton: {
    backgroundColor: '#001965',
    paddingVertical: '4%',
    paddingHorizontal: '10%',
    borderRadius: 8,
    width: '80%',
    alignSelf: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? 18 : 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
