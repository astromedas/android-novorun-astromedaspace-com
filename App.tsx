/* eslint-disable react/no-unstable-nested-components */
import React, {useEffect, useState} from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import {
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfilePage from './src/screens/ProfileScreen';
import MapScreen from './src/screens/MapScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import EventScreen from './src/screens/EventScreen';
import UserContext from './src/context/userContext';
import {
  checkOnboardingStatus,
  initializeDatabase,
} from './src/components/sqliteUtils';
import OnboardingScreen from './src/screens/FirstTimeUserScreen';
import Geolocation from '@react-native-community/geolocation';
import LeaderBoard from './src/screens/LeaderBoard';
import ActivityScreen from './src/screens/ActivityScreen';
import StatsScreen from './src/screens/StatsScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventModeScreen from './src/screens/EventModeScreen';
import SplashScreen from 'react-native-splash-screen';
import SplashImageScreen from './src/screens/SplashScreen';
import TermsAndConditionsScreen from './src/components/TermsAndConditionsScreen';
import appCheck from '@react-native-firebase/app-check';
import CommunityScreen from './src/screens/CommunityScreen';
import YourPostScreen from './src/screens/YourPostScreen';
import OTPLoginScreen from './src/screens/OTPLoginScreen';
import { navigationRef } from './src/utils/navigationRef';
import {NativeModules} from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OTPLogin: undefined;
  Home: undefined;
  BottomTabs: NavigatorScreenParams<BottomTabParamList>;
  NotificationScreen: undefined;
  MapScreen: {
    coordinates: {lat: number | string; lng: number | string}[];
    eventID: string;
    distance: string;
    category: string;
  };
  YourPostScreen: undefined;
  EventModeScreen: undefined;
  EventScreen: undefined;
  Onboarding: undefined;
  LeaderBoard: undefined;
  ActivityScreen: undefined;
  StatsScreen: undefined;
  TermsAndConditions: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Profile: {
    isFirstTime?: boolean;
  };
  MapScreen: {
    coordinates: {lat: number | string; lng: number | string}[];
    eventID: string;
    distance: string;
    category: string;
  };
  LeaderBoard: undefined;
  EventScreen: undefined;
  StatsScreen: undefined;
  CommunityScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

const BottomTabNavigator = () => {
  const iconSize = 20; // Reduced from default

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#001965',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: {
          fontSize: 10, // Reduced from 12
          fontWeight: '500',
        },
        tabBarStyle: {
          height: 70, // Increased height to accommodate padding
          paddingBottom: 20, // Increased bottom padding for navigation area
          paddingTop: 5, // Add some padding at the top
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({color}) => (
            <Image
              style={{width: iconSize, height: iconSize, tintColor: color}}
              source={require('./src/assets/home.png')}
            />
          ),
        }}
      />

      <Tab.Screen
        name="CommunityScreen"
        component={CommunityScreen}
        options={{
          title: 'Community',
          tabBarIcon: ({color}) => (
            <Image
              style={{width: iconSize, height: iconSize, tintColor: color}}
              source={require('./src/assets/community.png')}
            />
          ),
        }}
      />
      <Tab.Screen
        name="LeaderBoard"
        component={LeaderBoard}
        options={{
          title: 'LeaderBoard',
          tabBarIcon: ({color}) => (
            <Image
              style={{width: iconSize, height: iconSize, tintColor: color}}
              source={require('./src/assets/cup.png')}
            />
          ),
        }}
      />
      <Tab.Screen
        name="StatsScreen"
        component={StatsScreen}
        options={{
          title: 'Stats',
          tabBarIcon: ({color}) => (
            <Image
              style={{width: iconSize, height: iconSize, tintColor: color}}
              source={require('./src/assets/stats.png')}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfilePage}
        options={{
          title: 'Profile',
          tabBarIcon: ({color}) => (
            <Image
              style={{width: iconSize, height: iconSize, tintColor: color}}
              source={require('./src/assets/profile.png')}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  useEffect(() => {
    const initializeAppCheck = async () => {
      await appCheck().activate('play-integrity', true);
    };

    const configureGoogleSignIn = () => {
      GoogleSignin.configure({
        webClientId: '989682514176-4k30iajpe0s6e6oh52tbu1na7ml00k2v.apps.googleusercontent.com',
      });
    };

    initializeAppCheck();
    configureGoogleSignIn();
  }, []);
  // Remove local navigationRef since we're using the global one
  const checkApplicationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // Define all required permissions
        const permissions = {
          notification: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          location: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          locationBackground:
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          camera: PermissionsAndroid.PERMISSIONS.CAMERA,
          media: PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          foregroundService: PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE,
          foregroundLocation:
            PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE_LOCATION,
        };

        for (const [key, permission] of Object.entries(permissions)) {
          if (permission) {
            const granted = await PermissionsAndroid.request(permission);
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              Alert.alert(
                'Permission Required',
                `${key} permission is required for this feature.`,
              );
              return;
            }
          }
        }

        Geolocation.getCurrentPosition(
          () => {
            // console.log('Location services initialized successfully');
          },
          error => {
            if (error.code === 2) {
              Alert.alert(
                'Enable Location Services',
                'Location services are turned off. Please enable them in settings.',
                [
                  {text: 'Cancel', style: 'cancel'},
                  {
                    text: 'Go to Settings',
                    onPress: () => Linking.openSettings(),
                  },
                ],
              );
            }
          },
          {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
        );
      } catch (error) {
        // console.log('Permission Error:', error);
      }
    }
  };


  const [isLoggedIn, setLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string | undefined>(undefined);
  const [insideOutside, setInsideOutside] = useState<string | undefined>(
    undefined,
  );
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [picture, setPicture] = useState<string | undefined>(undefined);
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [isDefaultPassword, setDefaultPassword] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<
    boolean | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList>('Splash');

  useEffect(() => {
    checkApplicationPermission();
    // Remove version check from startup - let it happen later in MainActivity

    const loadUserSession = async () => {
      setIsLoading(true);
      try {
        await initializeDatabase();
        const status = await checkOnboardingStatus();
        setHasCompletedOnboarding(status);

        // Check if user is already logged in
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedToken = await AsyncStorage.getItem('userToken');
        console.log('stored userid received from async', storedUserId);
        if (storedUserId && storedToken) {
          setUserId(storedUserId);
          setAccessToken(storedToken);
          setLoggedIn(true); // This will trigger a re-render with the correct navigation
        } else {
          setLoggedIn(false); // Explicitly set to false if no stored credentials
        }
      } catch (error) {
        // console.log('Error loading session:', error);
        setLoggedIn(false); // Handle error case
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserSession();
    const loadOnboardingStatus = async () => {
      try {
        await initializeDatabase();
        const status = await checkOnboardingStatus();
        setHasCompletedOnboarding(status);
        // console.log('Onboarding status loaded:', status);
      } catch (error) {
        // console.log('Error loading onboarding status:', error);
      }
    };
    loadOnboardingStatus();
    const checkInitialRoute = async () => {
      try {
        // Check for active tracking using native LocationService
        const {LocationService} = NativeModules;
        let activeTracking = false;
        let trackingType = null;

        if (LocationService) {
          try {
            const trackingData = await LocationService.getCurrentTrackingData();
            if (trackingData && trackingData.isTracking) {
              trackingType = await LocationService.getTrackingType();
              activeTracking = true;
              console.log(`Active tracking detected during app start - Type: ${trackingType}`);
            }
          } catch (error) {
            console.log('Error checking native tracking data:', error);
          }
        }

        // If there's active tracking, navigate to the appropriate screen
        if (activeTracking && trackingType) {
          if (trackingType === 'activity') {
            setInitialRoute('ActivityScreen');
          } else if (trackingType === 'race') {
            setInitialRoute('MapScreen');
          }
          return;
        }

        // Default navigation logic if no active tracking
        if (!hasCompletedOnboarding) {
          setInitialRoute('Onboarding');
        } else if (isLoggedIn) {
          setInitialRoute('BottomTabs');
        } else {
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error('Error checking initial route:', error);
        setInitialRoute('Login');
      }
    };

    checkInitialRoute();
  }, [hasCompletedOnboarding, isLoggedIn]);

  // Add this effect at the top of your existing useEffect
  useEffect(() => {
    // Hide splash screen once app is ready
    const initApp = async () => {
      await initializeDatabase();
      await checkApplicationPermission();
      SplashScreen.hide();
    };

    initApp();
  }, []);

  if (isLoading || hasCompletedOnboarding === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  return (
    <UserContext.Provider
      value={{
        isLoggedIn,
        setLoggedIn,
        userId,
        setUserId,
        email,
        setEmail,
        picture,
        setPicture,
        accessToken,
        setAccessToken,
        name,
        setName,
        insideOutside,
        setInsideOutside,
        isDefaultPassword,
        weight,
        setWeight,
        setDefaultPassword,
        gender,
        setGender,
      }}>
      <SafeAreaView style={styles.container}>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              headerShown: false,
            }}>
            <Stack.Screen name="Splash" component={SplashImageScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTPLogin" component={OTPLoginScreen} />
            <Stack.Screen
              name="ActivityScreen"
              component={ActivityScreen}
              options={{
                headerShown: false,
                gestureEnabled: false, // Prevent swipe back while tracking
              }}
            />
            <Stack.Screen name="BottomTabs" component={BottomTabNavigator} />
            <Stack.Screen
              name="NotificationScreen"
              component={NotificationScreen}
            />
            <Stack.Screen
              name="MapScreen"
              component={MapScreen}
              options={{
                headerShown: false,
                gestureEnabled: false, // Prevent swipe back while tracking
              }}
            />
            <Stack.Screen
              name="TermsAndConditions"
              component={TermsAndConditionsScreen}
            />
            <Stack.Screen name="EventModeScreen" component={EventModeScreen} />
            <Stack.Screen name="YourPostScreen" component={YourPostScreen} />
            <Stack.Screen name="LeaderBoard" component={LeaderBoard} />
            <Stack.Screen name="EventScreen" component={EventScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </UserContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
