import React, {useState, useEffect, useContext, useCallback} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  SafeAreaView,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {useNavigation} from '@react-navigation/native';
import axios from 'axios';
import {BottomTabParamList, RootStackParamList} from '../../App';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import UserContext from '../context/userContext';
import {Image} from 'react-native';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SettingsModal from '../components/settingModal';
import CityAutocomplete from '../components/CityAutocomplete';

interface ProfileData {
  email: string;
  fullName: string;
  gender: string;
  height: number;
  weight: number;
  age: number;
  mobile: string;
  userId: string;
  city: string;
}

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;
type homebottomProp = NativeStackNavigationProp<BottomTabParamList, 'Home'>;

const ProfilePage: React.FC = () => {
  const user = useContext(UserContext);
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const navi = useNavigation<homebottomProp>();
  const [email, setEmail] = useState<string>(user?.email || '');
  const [userId] = useState<string>(user?.userId || '');
  const [fullName, setFullName] = useState<string>('');
  const [gender, setGender] = useState<string>('Male');
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [isProfileModalVisible, setProfileModalVisible] =
    useState<boolean>(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);

  const handleImagePicker = () => {
    Alert.alert('Choose Image', 'Select an option', [
      {
        text: 'Camera',
        onPress: () => openCamera(),
      },
      {
        text: 'Gallery',
        onPress: () => openGallery(),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const compressImage = async (imageUri: string) => {
    try {
      const compressedImage = await ImageResizer.createResizedImage(
        imageUri,
        600,
        600,
        'JPEG',
        60,
      );
      return compressedImage.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return imageUri;
    }
  };

  const openCamera = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      includeBase64: false,
    });
    if (result.assets && result.assets.length > 0) {
      if (!result.assets[0].uri) {
        console.error('Image URI is undefined');
        return;
      }
      const compressedUri = await compressImage(result.assets[0].uri);
      const base64Image = await convertToBase64(compressedUri);
      sendImageToServer(base64Image);
    }
  };

  const openGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: false,
    });
    if (result.assets && result.assets.length > 0) {
      if (!result.assets[0].uri) {
        console.error('Image URI is undefined');
        return;
      }
      const compressedUri = await compressImage(result.assets[0].uri);
      const base64Image = await convertToBase64(compressedUri);
      sendImageToServer(base64Image);
    }
  };

  const convertToBase64 = async (uri: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      RNFS.readFile(uri, 'base64')
        .then((base64: string) => resolve(`data:image/jpeg;base64,${base64}`))
        .catch((error: Error) => reject(error));
    });
  };

  const fetchProfileData = useCallback(async () => {
    try {
      const response = await axios.get(
        `https://astro-api-okfis.ondigitalocean.app/api/user/profile/check?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        },
      );
      if (response.status === 200) {
        const profileData: ProfileData = response.data.profile;
        user?.setName(response.data.profile.fullName);
        user?.setWeight(response.data.profile.weight);
        user?.setGender(response.data.profile.gender);
        setEmail(profileData.email || user?.email || '');
        setFullName(profileData.fullName || '');
        setGender(profileData.gender || 'Male');
        setHeight(profileData.height?.toString() || '');
        setWeight(profileData.weight?.toString() || '');
        setAge(profileData.age?.toString() || '');
        setMobile(profileData.mobile || '');
        setCity(profileData.city || '');
      }
    } catch (error: any) {
      console.error('Error fetching profile data:', error);
      // If profile doesn't exist, redirect to home screen
      // where the onboarding process will handle profile creation
      navi.navigate('Home');
    }
  }, [userId, user, navi]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const sendImageToServer = async (base64Image: string) => {
    try {
      const url =
        'https://astro-api-okfis.ondigitalocean.app/api/user/profile/profilepic';
      const response = await axios({
        method: 'put',
        url,
        headers: {
          Authorization: `Bearer ${user?.accessToken}`,
        },
        data: {
          image: base64Image,
          userId: user?.userId,
        },
      });
      user?.setPicture(base64Image);
      if (response.status === 201) {
        fetchProfileData();
      }
    } catch (error: any) {
      console.error(
        'Error uploading image:',
        error.response?.data || error.message,
      );
    }
  };

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name is required.');
      return false;
    }
    if (isNaN(Number(height)) || Number(height) <= 0) {
      Alert.alert('Validation Error', 'Height must be a positive number.');
      return false;
    }
    if (isNaN(Number(weight)) || Number(weight) <= 0) {
      Alert.alert('Validation Error', 'Weight must be a positive number.');
      return false;
    }
    if (isNaN(Number(age)) || Number(age) <= 0) {
      Alert.alert('Validation Error', 'Age must be a positive number.');
      return false;
    }
    if (!/^\d{10}$/.test(mobile)) {
      Alert.alert(
        'Validation Error',
        'Mobile number must be a valid 10-digit number.',
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const profileData: ProfileData = {
      userId,
      email,
      fullName,
      gender,
      height: parseFloat(height),
      weight: parseFloat(weight),
      age: parseInt(age, 10),
      mobile,
      city,
    };

    try {
      const response = await axios.put(
        'https://astro-api-okfis.ondigitalocean.app/api/user/profile/update',
        profileData,
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        },
      );
      if (response.status === 200) {
        navi.navigate('Home');
        user?.setName(response.data.profile?.fullName);
        user?.setWeight(response.data.profile?.weight);
        user?.setGender(response.data.profile?.gender);
        Alert.alert('Success', 'Profile updated successfully!');
        setProfileModalVisible(false);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'An error occurred while updating the profile. Please try again.',
      );
      console.error(error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await axios.post(
        'https://astro-api-okfis.ondigitalocean.app/api/user/deletion',
        {userId: user?.userId},
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        },
      );
      if (response.status === 200) {
        Alert.alert(
          'Account Deactivated',
          'Your account has been deactivated. You have 15 days to recover it by logging in.',
          [
            {
              text: 'OK',
              onPress: () => {
                handleLogout();
              },
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
      console.error('Delete account error:', error);
    }
  };

  const handleSettings = () => {
    setSettingsModalVisible(true);
  };

  const handleLogout = async () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            user?.setAccessToken('');
            user?.setEmail('');
            user?.setLoggedIn(false);
            user?.setPicture('');
            user?.setName('');
            user?.setWeight(0);
            navigation.navigate('Login');
          } catch (error) {
            console.log('Error during logout:', error);
          }
        },
      },
    ]);
  };

  const handleEvent = () => {
    navigation.navigate('YourPostScreen');
  };

  const handleProfile = () => {
    setProfileModalVisible(true);
  };

  const design = '>';

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Image
          source={
            user?.picture ? {uri: user?.picture} : require('../assets/user.png')
          }
          style={styles.profileimage}
        />
        <TouchableOpacity style={styles.addIcon} onPress={handleImagePicker}>
          <Text style={styles.addIconText}>+</Text>
        </TouchableOpacity>
      </View>
      <View>
        <Text style={styles.username}>{user?.name}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleProfile}>
          <Text style={styles.edit}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profilebuttons}
          onPress={handleSettings}>
          <Text style={styles.buttonText}>Settings </Text>
          <Text style={styles.buttonText}>{design}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profilebuttons} onPress={handleEvent}>
          <Text style={styles.buttonText}>Posts </Text>
          <Text style={styles.buttonText}>{design}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profilebuttons} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout </Text>
          <Text style={styles.buttonText}>{design}</Text>
        </TouchableOpacity>
      </View>
      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        onDeleteAccount={handleDeleteAccount}
        onTermsPress={() => {
          setSettingsModalVisible(false);
          navigation.navigate('TermsAndConditions');
        }}
      />
      <Modal
        visible={isProfileModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setProfileModalVisible(false)}>
        <TouchableWithoutFeedback
          onPress={() => {
            setProfileModalVisible(false);
          }}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.header}>Edit Bio</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setProfileModalVisible(false)}>
                  <Text style={styles.closeButtonText}>X</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="grey"
                  value={fullName}
                  onChangeText={setFullName}
                />
                <Picker
                  selectedValue={gender}
                  style={styles.picker}
                  onValueChange={itemValue => setGender(itemValue)}>
                  <Picker.Item label="Male" value="Male" />
                  <Picker.Item label="Female" value="Female" />
                  <Picker.Item label="Other" value="Other" />
                </Picker>
                <TextInput
                  style={styles.input}
                  placeholder="Height (cm)"
                  placeholderTextColor="grey"
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Weight (kg)"
                  placeholderTextColor="grey"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Age"
                  placeholderTextColor="grey"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Number"
                  placeholderTextColor="grey"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <CityAutocomplete
                  onSelectCity={selectedCity => setCity(selectedCity)}
                  initialCity={city}
                />
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}>
                  <Text style={styles.submitButtonText}>Update Profile</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingTop: 25,
  },
  profileimage: {
    width: 150,
    height: 150,
    borderRadius: 70,
    marginBottom: 10,
    marginTop: 90,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  addIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007BFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  username: {
    fontWeight: 'bold',
    color: '#001965',
    fontSize: 22,
  },
  buttonContainer: {
    marginTop: 30,
    elevation: 5,
    width: '100%',
    alignItems: 'center',
  },
  edit: {
    backgroundColor: '#001f7f',
    color: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 35,
    fontWeight: 'bold',
  },
  profilebuttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#D9D9D9',
    marginTop: 5,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 15,
    width: '80%',
  },
  buttonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#001965',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    color: 'black',
  },
  picker: {
    width: '100%',
    height: 50,
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#001965',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  cityInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
  },
  autocompleteContainer: {
    width: '100%',
    zIndex: 1,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: 'white',
  },
  suggestionText: {
    fontSize: 16,
    color: 'black',
  },
  suggestionsList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    marginBottom: 15,
  },
});

export default ProfilePage;
