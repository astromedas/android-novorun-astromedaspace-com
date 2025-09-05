import React, {useContext, useEffect, useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  // Alert,
} from 'react-native';
import MapView, {Marker, Region} from 'react-native-maps';
import Geolocation, {
  GeolocationResponse,
  GeolocationError,
} from '@react-native-community/geolocation';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import UserContext from '../context/userContext';
import axios, {AxiosResponse} from 'axios';
// import {InteractionManager} from 'react-native';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ActivityScreen'
>;

interface StepsData {
  stepsToday: number;
  goalSteps: number;
}

interface User {
  userId?: string;
  accessToken?: string;
  gender?: string;
}

const motivationalQuotes = [
  'The journey of a thousand miles begins with a single step. - Lao Tzu',
  'Walking is the best possible exercise. - Thomas Jefferson',
  'Every step you take is a step toward a healthier you.',
];

const StepsAndMap: React.FC = () => {
  const user = useContext(UserContext) as User | null;
  const [region, setRegion] = useState<Region | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const [mapError, setMapError] = useState<string | null>(null);
  const [stepsData, setStepsData] = useState<StepsData>({
    stepsToday: 0,
    goalSteps: 10000,
  });
  const [isLoadingSteps, setIsLoadingSteps] = useState(true);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const navigation = useNavigation<NavigationProp>();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const quoteIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cycle motivational quotes every 10 seconds
  useEffect(() => {
    quoteIntervalRef.current = setInterval(() => {
      setCurrentQuoteIndex(prev => (prev + 1) % motivationalQuotes.length);
    }, 10000);

    return () => {
      if (quoteIntervalRef.current) {
        clearInterval(quoteIntervalRef.current);
      }
    };
  }, []);

  // Fetch steps data
  useEffect(() => {
    const fetchStepsData = async () => {
      if (!user?.userId || !user?.accessToken) {
        setIsLoadingSteps(false);
        return;
      }

      const date = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      abortControllerRef.current = new AbortController();
      try {
        setIsLoadingSteps(true);
        const response: AxiosResponse<{
          stepCount?: number;
          targetSteps?: number;
        }> = await axios.get(
          `https://ecf63b299473.ngrok-free.app/api/goal/view?userId=${user.userId}&date=${date}`,
          {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
            signal: abortControllerRef.current.signal,
            timeout: 10000,
          },
        );

        const {stepCount = 0, targetSteps = 10000} = response.data || {};
        setStepsData({
          stepsToday: stepCount,
          goalSteps: targetSteps,
        });
      } catch (error: any) {
        if (axios.isCancel(error)) {
          console.log('Steps API request cancelled');
        } else {
          console.error('Error fetching steps data:', error.message);
          // Alert.alert(
          //   'Error',
          //   'Failed to fetch steps data. Please try again later.',
          // );
          setStepsData({
            stepsToday: 0,
            goalSteps: 10000,
          });
        }
      } finally {
        setIsLoadingSteps(false);
      }
    };

    fetchStepsData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user?.userId, user?.accessToken]);

  // Handle geolocation
  useEffect(() => {
    let watchId: number | null = null;
    let timeout: NodeJS.Timeout | null = setTimeout(() => {
      // setMapError('Unable to retrieve location. Please check your settings.');
      setIsLoading(false);
      console.log('Geolocation timed out after 10 seconds');
    }, 10000);

    Geolocation.requestAuthorization(
      () => {
        watchId = Geolocation.watchPosition(
          (position: GeolocationResponse) => {
            const {latitude, longitude} = position.coords;
            setRegion({
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
            setIsLoading(false);
            if (timeout) {
              clearTimeout(timeout);
              timeout = null;
            }
            console.log('Geolocation updated:', {latitude, longitude});
          },
          (error: GeolocationError) => {
            console.error('Location error:', error.message);
            // setMapError(
            //   'Failed to get location. Please enable location services.',
            // );
            setIsLoading(false);
            if (timeout) {
              clearTimeout(timeout);
              timeout = null;
            }
          },
          {enableHighAccuracy: true, distanceFilter: 20, timeout: 10000},
        );
      },
      (error: GeolocationError) => {
        console.error('Permission error:', error);
        // setMapError(
        //   'Location permission denied. Please enable it in settings.',
        // );
        setIsLoading(false);
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      },
    );

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (watchId !== null) {
        Geolocation.clearWatch(watchId); // Fixed: Changed `wId` to `watchId`
        Geolocation.stopObserving();
        console.log('Geolocation watch cleared');
      }
    };
  }, []);

  const handleActivityPress = () => {
    navigation.navigate('ActivityScreen');
  };

  const calculateProgress = () => {
    if (stepsData.goalSteps <= 0) {
      return 0;
    }
    const percentage = (stepsData.stepsToday / stepsData.goalSteps) * 100;
    return Math.min(percentage, 100);
  };

  const renderMapContent = () => {
    if (isLoading) {
      return (
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>
            {motivationalQuotes[currentQuoteIndex]}
          </Text>
        </View>
      );
    }
    if (!region) {
      return (
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>
            {motivationalQuotes[currentQuoteIndex]}
          </Text>
        </View>
      );
    }
    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onMapReady={() => console.log('MapView ready')}
        onRegionChangeComplete={(newRegion, {isGesture}) => {
          console.log('MapView region changed:', newRegion, {isGesture});
        }}
        cacheEnabled={false}>
        <Marker
          coordinate={{
            latitude: region.latitude,
            longitude: region.longitude,
          }}
        />
      </MapView>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.stepsContainer}
        onPress={handleActivityPress}
        activeOpacity={0.8}
        accessibilityLabel="View activity details"
        accessibilityRole="button">
        {isLoadingSteps ? (
          <ActivityIndicator size="small" color="#001965" />
        ) : (
          <>
            <Text style={styles.stepsText}>
              Steps: {stepsData.stepsToday.toLocaleString()}
            </Text>
            <View style={styles.stepsProgressBar}>
              <View
                style={[
                  styles.stepsProgress,
                  {width: `${calculateProgress()}%`},
                ]}
              />
            </View>
            <Text style={styles.stepsGoal}>
              Goal: {stepsData.goalSteps.toLocaleString()}
            </Text>
            <View style={styles.startWalkingButton}>
              <Text style={styles.startWalkingText}>Start Walking</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
      <View style={styles.mapContainer}>{renderMapContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    height: 200,
    backgroundColor: 'transparent',
    alignItems: 'center',
    marginVertical: 10,
  },
  stepsText: {
    fontFamily: 'apis',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#001965',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepsGoal: {
    fontFamily: 'apis',
    fontSize: 14,
    color: '#001965',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
  stepsProgressBar: {
    width: '85%',
    height: 10,
    backgroundColor: '#E0E5F2',
    borderRadius: 5,
    overflow: 'hidden',
    elevation: 1,
  },
  stepsProgress: {
    height: '100%',
    backgroundColor: '#001965',
    borderRadius: 5,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  quoteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
  },
  quoteText: {
    fontFamily: 'apis',
    fontSize: 16,
    color: '#001965',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: {
    fontFamily: 'apis',
    fontSize: 14,
    color: '#ff4d4d',
    textAlign: 'center',
    marginBottom: 10,
  },
  mapContainer: {
    flex: 1.2,
    height: '100%',
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepsContainer: {
    flex: 1,
    height: '100%',
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 10,
  },
  startWalkingButton: {
    backgroundColor: '#001965',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  startWalkingText: {
    fontFamily: 'apis',
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StepsAndMap;
