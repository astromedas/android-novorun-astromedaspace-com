/* eslint-disable radix */
import React, {
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import MapView, {Polyline} from 'react-native-maps';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  Modal,
  Alert,
  AppState,
  BackHandler,
  NativeModules,
} from 'react-native';
import UserContext from '../context/userContext';
import {useNavigation, CommonActions} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SlideToStart from '../context/SliderComponent';
import {wp, hp} from '../components/responsive';
import Tts from 'react-native-tts';
import Geolocation from '@react-native-community/geolocation';
import OfflineSyncService from '../utils/OfflineSyncService';
import { ScrollView } from 'react-native';

const ActivityScreen = () => {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    {latitude: number; longitude: number}[]
  >([]);

  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [caloriesBurned, setCaloriesBurned] = useState<number>(0);
  const [avgPace, setAvgPace] = useState<number>(0);
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [showSlideToStart, setShowSlideToStart] = useState(true);
  const [lastActiveTime, setLastActiveTime] = useState<number | null>(null);
  const [isSendingData, setIsSendingData] = useState(false);
  const mapRef = useRef<MapView>(null);
  const distanceRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const caloriesBurnedRef = useRef<number>(0);
  const avgPaceRef = useRef<number>(0);
  const routeCoordinatesRef = useRef<{latitude: number; longitude: number}[]>(
    [],
  );
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startLocation = useRef<{latitude: number; longitude: number} | null>(
    null,
  );
  const startTimeRef = useRef<string | null>(null);
  const endTimeRef = useRef<string | null>(null);
  const avgSpeedRef = useRef<number>(0);
  const [avgSpeed, setAvgSpeed] = useState(0);

  const user = useContext(UserContext);
  const navigation = useNavigation();

  const handleEndActivity = useCallback(async () => {
    const {LocationService} = NativeModules;

    try {
      endTimeRef.current = new Date().toISOString();

      // Get final data from native service and stop tracking
      const finalData = await LocationService.stopTracking();

      // Update final stats with data from native service
      setDistance(finalData.distance);
      setDuration(finalData.duration);
      setRouteCoordinates(finalData.coordinates);

      // Update refs with final data
      distanceRef.current = finalData.distance;
      durationRef.current = finalData.duration;
      routeCoordinatesRef.current = finalData.coordinates;

      // Calculate final derived stats
      if (user?.weight && finalData.distance > 0) {
        const finalCalories = finalData.distance * user.weight;
        setCaloriesBurned(finalCalories);
        caloriesBurnedRef.current = finalCalories;

        const finalAvgPace = finalData.duration / finalData.distance / 60;
        setAvgPace(finalAvgPace);
        avgPaceRef.current = finalAvgPace;

        const finalAvgSpeed = finalData.distance / (finalData.duration / 3600);
        setAvgSpeed(finalAvgSpeed);
        avgSpeedRef.current = finalAvgSpeed;
      }

      setTracking(false);
      setPaused(false);
      setShowControls(false);
      setShowSlideToStart(true);
      setModalVisible(true);

      await AsyncStorage.removeItem('activityTimestamp');
      await AsyncStorage.removeItem('activityDuration');
      Tts.speak('Activity completed.');

      console.log('Activity ended with final data:', finalData);

      // Save activity data to server with offline sync
      if (user?.userId && user?.accessToken) {
        setIsSendingData(true);
        try {
          const sessionId = `activity_${Date.now()}_${user.userId}`;
          const activityData = {
            userId: user.userId,
            distance: distanceRef.current,
            duration: durationRef.current,
            calories: caloriesBurnedRef.current,
            avgPace: avgPaceRef.current,
            avgSpeed: avgSpeedRef.current,
            routeCoordinates: routeCoordinatesRef.current,
            startTime: startTimeRef.current || new Date().toISOString(),
            endTime: endTimeRef.current || new Date().toISOString(),
            timestamp: new Date().toISOString(),
          };

          // Save activity data locally immediately
          await OfflineSyncService.saveActivityData({
            ...activityData,
            sessionId,
            synced: false,
            syncAttempts: 0,
          });

          console.log('Sending activity data for session:', sessionId);

          // Add to sync queue instead of direct API call
          await OfflineSyncService.addToSyncQueue(
            'activity_create',
            'https://astro-api-okfis.ondigitalocean.app/api/activity/create',
            activityData,
            {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${user?.accessToken}`,
            },
            sessionId,
          );
        } catch (syncError) {
          console.error('Error queuing activity data:', syncError);
        } finally {
          setIsSendingData(false);
        }
      }
    } catch (error) {
      console.log('Error ending activity:', error);
      Alert.alert('Error', 'Failed to end activity properly.');
    }
  }, [user?.weight, user?.userId, user?.accessToken]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (tracking) {
          Alert.alert(
            'Activity in Progress',
            'Do you want to stop your current activity?',
            [
              {
                text: 'Continue Activity',
                onPress: () => null,
                style: 'cancel',
              },
              {
                text: 'Stop & Exit',
                onPress: async () => {
                  await handleEndActivity();
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {name: 'BottomTabs', params: {screen: 'HomeScreen'}},
                      ],
                    }),
                  );
                },
              },
            ],
          );
          return true;
        }
        return false;
      },
    );
    return () => backHandler.remove();
  }, [tracking, navigation, handleEndActivity]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'background') {
        // Save current state when going to background
        await AsyncStorage.setItem('timestamp', Date.now().toString());
        await AsyncStorage.setItem('distance', distance.toString());
        await AsyncStorage.setItem('duration', duration.toString());
        await AsyncStorage.setItem(
          'routeCoordinates',
          JSON.stringify(routeCoordinates),
        );
        setLastActiveTime(Date.now());
      } else if (nextAppState === 'active' && tracking) {
        // Restore state when returning to foreground
        try {
          const savedTimestamp = await AsyncStorage.getItem('timestamp');
          const savedDistance = await AsyncStorage.getItem('distance');
          const savedDuration = await AsyncStorage.getItem('duration');
          const savedRoute = await AsyncStorage.getItem('routeCoordinates');

          if (savedTimestamp && savedDistance && savedDuration) {
            const backgroundTime = Math.floor(
              (Date.now() - parseInt(savedTimestamp)) / 1000,
            );
            setDuration(parseInt(savedDuration) + backgroundTime);
            setDistance(parseFloat(savedDistance));

            if (savedRoute) {
              try {
                const parsedRoute = JSON.parse(savedRoute);
                setRouteCoordinates(parsedRoute);
              } catch (e) {
                console.log('Error parsing saved route:', e);
              }
            }
          }

          // Re-sync with native service
          const {LocationService} = NativeModules;
          LocationService.syncState();
        } catch (error) {
          console.log('Error restoring state:', error);
        }
      }
    };

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => {
      appStateSubscription.remove();
    };
  }, [lastActiveTime, tracking, distance, duration, routeCoordinates]);

  // MapMyWalk-style state restoration using direct native module calls
  useEffect(() => {
    const {LocationService} = NativeModules;

    // Restore tracking state when screen loads (like MapMyWalk)
    const restoreTrackingState = async () => {
      try {
        const trackingData = await LocationService.getCurrentTrackingData();

        if (trackingData.isTracking) {
          setTracking(true);
          setPaused(trackingData.isPaused);
          setDistance(trackingData.distance);
          setDuration(trackingData.duration);

          // Restore route coordinates
          if (trackingData.coordinates && trackingData.coordinates.length > 0) {
            setRouteCoordinates(trackingData.coordinates);

            // Move to current location
            if (trackingData.currentLocation) {
              setCurrentLocation(trackingData.currentLocation);
              mapRef.current?.animateToRegion(
                {
                  latitude: trackingData.currentLocation.latitude,
                  longitude: trackingData.currentLocation.longitude,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                },
                1000,
              );
            }
          }

          // Calculate derived stats - always calculate if we have distance and duration
          if (trackingData.distance > 0 && trackingData.duration > 0) {
            // Use stored weight from native service, fallback to user context weight, then AsyncStorage, then default
            let weight = trackingData.weight || user?.weight;
            if (!weight) {
              try {
                const storedWeight = await AsyncStorage.getItem('userWeight');
                weight = storedWeight ? parseFloat(storedWeight) : 70;
              } catch (error) {
                weight = 70; // Default fallback
              }
            }

            const calories = trackingData.distance * weight;
            setCaloriesBurned(calories);
            caloriesBurnedRef.current = calories;

            const avgPaceCalc =
              trackingData.duration / trackingData.distance / 60;
            setAvgPace(avgPaceCalc);
            avgPaceRef.current = avgPaceCalc;

            const avgSpeedCalc =
              trackingData.distance / (trackingData.duration / 3600);
            setAvgSpeed(avgSpeedCalc);
            avgSpeedRef.current = avgSpeedCalc;

            console.log(
              `Activity restored with stats - Distance: ${
                trackingData.distance
              }km, Weight: ${weight}kg, Calories: ${calories}, Pace: ${avgPaceCalc.toFixed(
                2,
              )}`,
            );
          }

          // Update refs
          distanceRef.current = trackingData.distance;
          durationRef.current = trackingData.duration;
          routeCoordinatesRef.current = trackingData.coordinates;

          console.log('Restored tracking state:', trackingData);
        }
      } catch (error) {
        console.log('Error restoring tracking state:', error);
      }
    };

    restoreTrackingState();
  }, [user?.weight]);

  // Polling for live updates during tracking (like MapMyWalk)
  useEffect(() => {
    if (!tracking || paused) {
      return;
    }

    const {LocationService} = NativeModules;

    const pollTrackingData = async () => {
      try {
        const trackingData = await LocationService.getCurrentTrackingData();

        // Update UI with fresh data from native service
        setDistance(trackingData.distance);
        setDuration(trackingData.duration);

        // Update route coordinates smoothly
        if (
          trackingData.coordinates &&
          trackingData.coordinates.length > routeCoordinates.length
        ) {
          setRouteCoordinates(trackingData.coordinates);

          // Move map to latest position
          if (trackingData.currentLocation) {
            setCurrentLocation(trackingData.currentLocation);
            mapRef.current?.animateToRegion(
              {
                latitude: trackingData.currentLocation.latitude,
                longitude: trackingData.currentLocation.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              },
              500,
            );
          }
        }

        // Update derived stats - always calculate if we have distance and duration
        if (trackingData.distance > 0 && trackingData.duration > 0) {
          // Use stored weight from native service, fallback to user context weight, then AsyncStorage, then default
          let weight = trackingData.weight || user?.weight;
          if (!weight) {
            try {
              const storedWeight = await AsyncStorage.getItem('userWeight');
              weight = storedWeight ? parseFloat(storedWeight) : 70;
            } catch (error) {
              weight = 70; // Default fallback
            }
          }

          const calories = trackingData.distance * weight;
          setCaloriesBurned(calories);
          caloriesBurnedRef.current = calories;

          const avgPaceCalc =
            trackingData.duration / trackingData.distance / 60;
          setAvgPace(avgPaceCalc);
          avgPaceRef.current = avgPaceCalc;

          const avgSpeedCalc =
            trackingData.distance / (trackingData.duration / 3600);
          setAvgSpeed(avgSpeedCalc);
          avgSpeedRef.current = avgSpeedCalc;

          console.log(
            `Live stats update - Distance: ${
              trackingData.distance
            }km, Weight: ${weight}kg, Calories: ${calories}, Pace: ${avgPaceCalc.toFixed(
              2,
            )}`,
          );
        }

        // Update refs
        distanceRef.current = trackingData.distance;
        durationRef.current = trackingData.duration;
        routeCoordinatesRef.current = trackingData.coordinates;

        // Handle distance announcements
        if ((global as any).handleActivityAnnouncements) {
          (global as any).handleActivityAnnouncements(trackingData.distance);
        }
      } catch (error) {
        console.log('Error polling tracking data:', error);
      }
    };

    // Poll every 2 seconds during active tracking
    const interval = setInterval(pollTrackingData, 2000);

    return () => clearInterval(interval);
  }, [tracking, paused, routeCoordinates.length, user?.weight]);

  useEffect(() => {
    distanceRef.current = distance;
    durationRef.current = duration;
    caloriesBurnedRef.current = caloriesBurned;
    avgPaceRef.current = avgPace;
    routeCoordinatesRef.current = routeCoordinates;
    avgSpeedRef.current = avgSpeed;
  }, [distance, duration, caloriesBurned, avgPace, routeCoordinates, avgSpeed]);

  const fetchCurrentLocation = () => {
    console.log('Fetching current location...');

    // First try: Fast network location (low accuracy but quick)
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        console.log('Network location found:', latitude, longitude);

        setCurrentLocation({latitude, longitude});

        // IMMEDIATE UI update
        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          },
          800,
        );

        // Now try to get GPS location for better accuracy (background)
        setTimeout(() => {
          Geolocation.getCurrentPosition(
            gpsPosition => {
              const {latitude: gpsLat, longitude: gpsLng} = gpsPosition.coords;
              console.log('GPS location found:', gpsLat, gpsLng);
              setCurrentLocation({latitude: gpsLat, longitude: gpsLng});
              mapRef.current?.animateToRegion(
                {
                  latitude: gpsLat,
                  longitude: gpsLng,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                },
                500,
              );
            },
            _gpsError => console.log('GPS failed, using network location'),
            {enableHighAccuracy: true, timeout: 10000, maximumAge: 0},
          );
        }, 1000);
      },
      error => {
        console.error('Network location failed:', error);

        // Fallback: Try with any available location (even cached)
        Geolocation.getCurrentPosition(
          position => {
            const {latitude, longitude} = position.coords;
            console.log('Fallback location found:', latitude, longitude);
            setCurrentLocation({latitude, longitude});
            mapRef.current?.animateToRegion(
              {
                latitude,
                longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              },
              800,
            );
          },
          finalError => {
            console.error('All location attempts failed:', finalError);
            // Use a default location as last resort
            console.log('Using default location');
          },
          {enableHighAccuracy: false, timeout: 15000, maximumAge: 300000}, // 5 min cache
        );
      },
      {enableHighAccuracy: false, timeout: 8000, maximumAge: 60000}, // 1 min cache, network first
    );
  };

  useEffect(() => {
    // Get location immediately when component mounts
    fetchCurrentLocation();

    return () => {
      // Cleanup is handled by the proper stop tracking flow
      // LocationService cleanup will happen when stopTracking() is called
    };
  }, []);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startTracking = async () => {
    const {LocationService} = NativeModules;

    try {
      // Get weight from user context or AsyncStorage fallback
      let weight = user?.weight;
      if (!weight) {
        try {
          const storedWeight = await AsyncStorage.getItem('userWeight');
          weight = storedWeight ? parseFloat(storedWeight) : 70;
        } catch (error) {
          weight = 70; // Default fallback
        }
      }

      // Direct call to start tracking in native service with type "activity", weight, and empty race params
      // Ensure all parameters are strings to avoid type casting errors
      await LocationService.startTracking(
        'activity',
        weight.toString(),
        '',
        '',
        '',
      );

      // Store start location for reference
      if (currentLocation) {
        startLocation.current = currentLocation;
      }

      // Initialize distance tracking for announcements
      let lastAnnouncedKm = Math.floor(distanceRef.current);

      // Set up announcement handler
      const handleAnnouncements = (newDistance: number) => {
        const roundedKm = Math.floor(newDistance);
        if (roundedKm > lastAnnouncedKm) {
          lastAnnouncedKm = roundedKm;
          Tts.speak(`${roundedKm} kilometer completed.`);
        }
      };

      // Store the handler for use in tracking updates
      (global as any).handleActivityAnnouncements = handleAnnouncements;

      console.log('Native activity tracking started successfully');
    } catch (error) {
      console.log('Error starting native tracking:', error);
      Alert.alert('Error', 'Failed to start tracking. Please try again.');
    }
  };
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      // No longer using Geolocation.watchPosition, so no cleanup needed
    };
  }, []);
  useEffect(() => {
    if (!paused && tracking) {
      durationIntervalRef.current = setInterval(() => {
        setDuration(prevDuration => prevDuration + 1);
      }, 1000);
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [paused, tracking]);

  const handleStartActivity = () => {
    setCountdown(5);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          return null;
        }
        return prev! - 1;
      });
    }, 1000);

    setTimeout(() => {
      startTimeRef.current = new Date().toISOString();
      setTracking(true);
      setDistance(0);
      setDuration(0);
      setCaloriesBurned(0);
      setAvgPace(0);
      setRouteCoordinates([]);
      startTracking();
      Tts.speak('Activity started. Enjoy your walk!');
    }, 5000);
  };

  const handlePauseResume = async () => {
    const {LocationService} = NativeModules;

    try {
      const isPaused = await LocationService.pauseResumeTracking();
      setPaused(isPaused);

      if (isPaused) {
        Tts.speak('Activity paused.');
      } else {
        Tts.speak('Activity resumed.');
      }
    } catch (error) {
      console.log('Error pausing/resuming tracking:', error);
      Alert.alert('Error', 'Failed to pause/resume tracking.');
    }
  };

  const handleModalOk = async () => {
    setModalVisible(false);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'BottomTabs', params: {screen: 'HomeScreen'}}],
      }),
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={true}
        showsMyLocationButton={true}
        initialRegion={{
          latitude: 37.78825, // Default - will be overridden by current location
          longitude: -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onMapReady={() => {
          console.log('Map ready!');
          // Location already fetched in useEffect
        }}>
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={8}
            strokeColor="gray"
          />
        )}
      </MapView>
      {countdown !== null && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}
      {!tracking && !countdown && showSlideToStart && (
        <View style={styles.sliderContainer}>
          <SlideToStart
            onSlideComplete={() => {
              setShowSlideToStart(false);
              handleStartActivity();
            }}
            text="Slide to Start Activity"
            backgroundColor="#001965"
          />
        </View>
      )}
      {tracking && !showControls && (
        <View style={styles.sliderContainer}>
          <SlideToStart
            onSlideComplete={() => setShowControls(true)}
            text="Slide for Controls"
            backgroundColor="#666"
          />
        </View>
      )}
      {tracking && showControls && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.pauseButton}
            onPress={() => {
              handlePauseResume();
              setShowControls(false);
            }}>
            <Text style={styles.buttonText}>{paused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={() => {
              handleEndActivity();
              setShowControls(false);
            }}>
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        </View>
      )}
      {!countdown && (
        <TouchableOpacity
          style={styles.gpsButton}
          onPress={fetchCurrentLocation}>
          <Image source={require('../assets/pin.png')} style={styles.gpsicon} />
        </TouchableOpacity>
      )}
      {!countdown && (
        <View style={styles.statsconcontainer}>
          <Image
            source={require('../assets/novoRUN_circular.png')}
            style={styles.logo}
          />
          <Text style={styles.timer}>{formatTime(duration)}</Text>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{distance.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Distance (km)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{caloriesBurned.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Calories (cal)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{avgPace.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Avg. Pace (min/km)</Text>
            </View>
          </View>
        </View>
      )}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Activity Completed!</Text>
            <View style={styles.modalStatsContainer}>
              <View style={styles.modalStatRow}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Distance</Text>
                  <Text style={styles.modalStatValue}>
                    {distance.toFixed(2)} km
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Duration</Text>
                  <Text style={styles.modalStatValue}>
                    {formatTime(duration)}
                  </Text>
                </View>
              </View>
              <View style={styles.modalStatRow}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Calories</Text>
                  <Text style={styles.modalStatValue}>
                    {caloriesBurned.toFixed(2)} cal
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Avg. Pace</Text>
                  <Text style={styles.modalStatValue}>
                    {avgPace.toFixed(2)} min/km
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.eventListContainer}>
              <Text style={styles.eventListTitle}>Recent Events</Text>
              <ScrollView
                style={styles.eventListScrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.eventListContent}>
                {/* Sample events - in a real app, these would come from your data source */}
                {[1, 2, 3, 4, 5].map((item) => (
                  <View key={item} style={styles.eventItem}>
                    <View style={styles.eventItemLeft}>
                      <Text style={styles.eventItemTitle}>Activity {item}</Text>
                      <Text style={styles.eventItemDate}>{new Date().toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.eventItemRight}>
                      <Text style={styles.eventItemDistance}>{(distance / item).toFixed(2)} km</Text>
                      <Text style={styles.eventItemDuration}>{formatTime(Math.floor(duration / item))}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleModalOk}
              disabled={isSendingData}>
              <Text style={styles.modalButtonText}>
                {isSendingData ? 'Saving...' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 25,
  },
  map: {
    flex: 1,
  },
  gpsicon: {
    width: wp(6),
    height: wp(6),
  },
  sliderContainer: {
    position: 'absolute',
    bottom: hp(2),
    width: wp(80),
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsconcontainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(2),
    backgroundColor: '#fff',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
  },
  logo: {
    width: wp(20),
    height: wp(20),
    marginBottom: hp(1),
  },
  timer: {
    fontSize: wp(12),
    fontWeight: 'bold',
    color: '#002366',
  },
  label: {
    fontSize: wp(4.5),
    color: '#002366',
    marginBottom: hp(1),
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: hp(1),
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: wp(6),
    fontWeight: 'bold',
    color: '#002366',
  },
  statLabel: {
    fontSize: wp(3.5),
    color: '#002366',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: hp(3),
    flexDirection: 'row',
    width: wp(70),
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  pauseButton: {
    width: wp(35),
    height: hp(5),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#008000',
    borderRadius: wp(1),
  },
  stopButton: {
    width: wp(35),
    height: hp(5),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#001965',
    borderRadius: wp(1),
  },
  buttonText: {
    color: 'white',
    fontSize: wp(3.5),
  },
  gpsButton: {
    position: 'absolute',
    bottom: hp(8),
    right: wp(5),
    backgroundColor: 'white',
    borderRadius: wp(6),
    padding: wp(2.5),
    elevation: 5,
  },
  countdownContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  countdownText: {
    fontSize: wp(20),
    color: 'black',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: wp(5),
    borderRadius: wp(2.5),
    alignItems: 'center',
    width: wp(85),
    maxHeight: hp(80),
  },
  modalTitle: {
    fontSize: wp(5),
    fontWeight: 'bold',
    marginBottom: hp(2),
    color: '#001965',
  },
  modalStatsContainer: {
    width: '100%',
    marginBottom: hp(2),
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  modalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: wp(3.5),
    color: '#666',
    marginBottom: hp(0.5),
  },
  modalStatValue: {
    fontSize: wp(4.5),
    fontWeight: 'bold',
    color: '#001965',
  },
  modalButton: {
    backgroundColor: '#001965',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(8),
    borderRadius: wp(1.5),
    marginTop: hp(1),
  },
  modalButtonText: {
    color: '#fff',
    fontSize: wp(4),
    fontWeight: 'bold',
  },
  // New styles for event list
  eventListContainer: {
    width: '100%',
    marginTop: hp(1),
    marginBottom: hp(1),
    maxHeight: hp(30),
  },
  eventListTitle: {
    fontSize: wp(4),
    fontWeight: 'bold',
    color: '#001965',
    marginBottom: hp(1),
    textAlign: 'left',
    width: '100%',
    paddingLeft: wp(2),
  },
  eventListScrollView: {
    maxHeight: hp(25),
    width: '100%',
    borderRadius: wp(2),
    backgroundColor: '#f5f5f5',
  },
  eventListContent: {
    paddingVertical: hp(1),
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
    marginHorizontal: wp(2),
    marginBottom: hp(1),
    borderRadius: wp(1),
    elevation: 2,
  },
  eventItemLeft: {
    flex: 1,
  },
  eventItemRight: {
    alignItems: 'flex-end',
  },
  eventItemTitle: {
    fontSize: wp(3.5),
    fontWeight: 'bold',
    color: '#001965',
    marginBottom: hp(0.3),
  },
  eventItemDate: {
    fontSize: wp(3),
    color: '#666',
  },
  eventItemDistance: {
    fontSize: wp(3.5),
    fontWeight: 'bold',
    color: '#001965',
  },
  eventItemDuration: {
    fontSize: wp(3),
    color: '#666',
    marginTop: hp(0.3),
  },
});

export default ActivityScreen;
