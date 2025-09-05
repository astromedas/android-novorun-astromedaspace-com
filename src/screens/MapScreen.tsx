/* eslint-disable radix */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useContext, useEffect, useRef, useState} from 'react';
import MapView, {Marker, Polyline} from 'react-native-maps';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  Modal,
  Alert,
  NativeModules,
  AppState,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

import {
  CompositeNavigationProp,
  RouteProp,
  useNavigation,
} from '@react-navigation/native';
import UserContext from '../context/userContext';
import Tts from 'react-native-tts';
import {BottomTabParamList, RootStackParamList} from '../../App';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import SlideToStart from '../context/SliderComponent';
import {wp, hp} from '../components/responsive';
import {BackHandler} from 'react-native';
import {CommonActions} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OfflineSyncService from '../utils/OfflineSyncService';

type RouteParams = {
  MapScreen: {
    coordinates: {lat: number | string; lng: number | string}[];
    eventID: string;
    distance: string;
    category: string;
  };
};

type MapScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<BottomTabParamList>
>;

const MapScreen = ({route}: {route: RouteProp<RouteParams, 'MapScreen'>}) => {
  const {coordinates, eventID, distance, category} = route.params || {};
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    {latitude: number; longitude: number}[]
  >([]);
  const [destination, setDestination] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const navigation = useNavigation<MapScreenNavigationProp>();
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const user = useContext(UserContext);
  const watchId = useRef<number | null>(null);
  const startLocation = useRef<{latitude: number; longitude: number} | null>(
    null,
  );
  const [selectedRouteType, setSelectedRouteType] = useState<'DEFAULT' | 'OWN'>(
    'DEFAULT',
  );
  const [distanceCovered, setDistanceCovered] = useState(0);
  const [walkedRoute, setWalkedRoute] = useState<
    {latitude: number; longitude: number}[]
  >([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const distanceCoveredRef = useRef(0);
  const durationRef = useRef(0);
  const caloriesBurnedRef = useRef(0);
  const avgPaceRef = useRef(0);
  const walkedRouteRef = useRef<{latitude: number; longitude: number}[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [avgPace, setAvgPace] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [showSlideToStart, setShowSlideToStart] = useState(true);
  const [duration, setDuration] = useState(0);
  const [lastActiveTime, setLastActiveTime] = useState<number | null>(null);
  const startTimeRef = useRef<string | null>(null);
  const endTimeRef = useRef<string | null>(null);
  const routeCoordinatesRef = useRef<{latitude: number; longitude: number}[]>(
    [],
  );
  const [avgSpeed, setAvgSpeed] = useState(0);
  const avgSpeedRef = useRef(0);
  const raceEndedRef = useRef(false); // Flag to prevent multiple race end calls

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Redirect to home screen
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{name: 'BottomTabs', params: {screen: 'HomeScreen'}}],
          }),
        );
        return true; // Prevent default back behavior
      },
    );
    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'background') {
        // Save current state when going to background
        await AsyncStorage.setItem('timestamp', Date.now().toString());
        await AsyncStorage.setItem('distance', distanceCovered.toString());
        await AsyncStorage.setItem('duration', duration.toString());
        await AsyncStorage.setItem('walkedRoute', JSON.stringify(walkedRoute));
        setLastActiveTime(Date.now());
      } else if (nextAppState === 'active' && tracking) {
        // Restore state when returning to foreground
        try {
          const savedTimestamp = await AsyncStorage.getItem('timestamp');
          const savedDistance = await AsyncStorage.getItem('distance');
          const savedDuration = await AsyncStorage.getItem('duration');
          const savedRoute = await AsyncStorage.getItem('walkedRoute');

          if (savedTimestamp && savedDistance && savedDuration) {
            const backgroundTime = Math.floor(
              (Date.now() - parseInt(savedTimestamp)) / 1000,
            );
            setDuration(parseInt(savedDuration) + backgroundTime);
            setDistanceCovered(parseFloat(savedDistance));

            if (savedRoute) {
              try {
                const parsedRoute = JSON.parse(savedRoute);
                setWalkedRoute(parsedRoute);
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
  }, [lastActiveTime, tracking, distanceCovered, duration, walkedRoute]);

  // State restoration when screen loads (MapMyWalk style)
  useEffect(() => {
    const {LocationService} = NativeModules;

    const restoreTrackingState = async () => {
      try {
        const trackingData = await LocationService.getCurrentTrackingData();

        if (trackingData.isTracking) {
          setTracking(true);
          setPaused(trackingData.isPaused);
          setDistanceCovered(trackingData.distance);
          setDuration(trackingData.duration);

          // Restore route coordinates
          if (trackingData.coordinates && trackingData.coordinates.length > 0) {
            setWalkedRoute(trackingData.coordinates);

            // Move to current location from tracking data, but also fetch fresh location
            if (trackingData.currentLocation) {
              setCurrentLocation(trackingData.currentLocation);
              mapRef.current?.animateCamera({
                center: {
                  latitude: trackingData.currentLocation.latitude,
                  longitude: trackingData.currentLocation.longitude,
                },
                zoom: 18,
              });
            } else {
              // If no stored location, fetch current location
              fetchCurrentLocation();
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
              `Race restored with stats - Distance: ${
                trackingData.distance
              }km, Weight: ${weight}kg, Calories: ${calories}, Pace: ${avgPaceCalc.toFixed(
                2,
              )}`,
            );
          }

          // Update refs
          distanceCoveredRef.current = trackingData.distance;
          durationRef.current = trackingData.duration;
          walkedRouteRef.current = trackingData.coordinates;

          console.log('Restored race tracking state:', trackingData);
        }
      } catch (error) {
        console.log('Error restoring race tracking state:', error);
      }
    };

    restoreTrackingState();
  }, []);

  // Polling for live updates during tracking (MapMyWalk style)
  useEffect(() => {
    if (!tracking || paused) {
      return;
    }

    const {LocationService} = NativeModules;

    const pollTrackingData = async () => {
      try {
        const trackingData = await LocationService.getCurrentTrackingData();

        if (trackingData.isTracking) {
          // Update UI with fresh data from native service
          setDistanceCovered(trackingData.distance);
          setDuration(trackingData.duration);

          // Update route coordinates smoothly
          if (
            trackingData.coordinates &&
            trackingData.coordinates.length > walkedRoute.length
          ) {
            setWalkedRoute(trackingData.coordinates);

            // Move map to latest position from tracking data
            if (trackingData.currentLocation) {
              setCurrentLocation(trackingData.currentLocation);
              mapRef.current?.animateCamera({
                center: {
                  latitude: trackingData.currentLocation.latitude,
                  longitude: trackingData.currentLocation.longitude,
                },
                zoom: 18,
              });
            }
          }

          // Update calories, pace, and speed calculations - always calculate if we have distance and duration
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

            const caloriesCalc = trackingData.distance * weight;
            setCaloriesBurned(caloriesCalc);
            caloriesBurnedRef.current = caloriesCalc;

            const avgPaceCalc =
              trackingData.duration / trackingData.distance / 60;
            setAvgPace(avgPaceCalc);
            avgPaceRef.current = avgPaceCalc;

            const avgSpeedCalc =
              trackingData.distance / (trackingData.duration / 3600);
            setAvgSpeed(avgSpeedCalc);
            avgSpeedRef.current = avgSpeedCalc;

            console.log(
              `Live race stats update - Distance: ${
                trackingData.distance
              }km, Weight: ${weight}kg, Calories: ${caloriesCalc}, Pace: ${avgPaceCalc.toFixed(
                2,
              )}`,
            );
          }

          // Check if target distance is reached - auto-stop race
          // Use stored distance from native service, fallback to route params
          const targetDistanceStr = trackingData.raceDistance || distance;
          const targetDistance = parseFloat(targetDistanceStr);

          if (
            targetDistance &&
            trackingData.distance >= targetDistance &&
            tracking &&
            !paused &&
            !raceEndedRef.current
          ) {
            console.log(
              `Target distance ${targetDistance}km reached! Auto-stopping race at ${trackingData.distance}km (using stored: ${trackingData.raceDistance})`,
            );
            raceEndedRef.current = true; // Set flag to prevent multiple calls
            Tts.speak(
              `Congratulations! You have completed ${targetDistance} kilometers. Race finished!`,
            );
            handleEndRace();
            return; // Exit early to prevent further processing
          }
        }
      } catch (error) {
        console.log('Error polling race tracking data:', error);
      }
    };

    // Poll every 2 seconds during active tracking
    const interval = setInterval(pollTrackingData, 2000);

    return () => clearInterval(interval);
  }, [tracking, paused, walkedRoute.length, distance]);

  useEffect(() => {
    distanceCoveredRef.current = distanceCovered;
    durationRef.current = duration;
    caloriesBurnedRef.current = caloriesBurned;
    avgPaceRef.current = avgPace;
    walkedRouteRef.current = walkedRoute;
    routeCoordinatesRef.current = walkedRoute;
    avgSpeedRef.current = avgSpeed;
  }, [
    distanceCovered,
    duration,
    caloriesBurned,
    avgPace,
    walkedRoute,
    avgSpeed,
  ]);

  useEffect(() => {
    if (
      coordinates &&
      coordinates.length === 1 &&
      coordinates[0].lat === 'own' &&
      coordinates[0].lng === 'own'
    ) {
      setDestination(null);
      setSelectedRouteType('OWN');
      setRouteCoordinates([]);
    } else if (coordinates && coordinates.length > 1) {
      const mappedCoordinates = coordinates
        .map(coord => ({
          latitude:
            typeof coord.lat === 'number' ? coord.lat : parseFloat(coord.lat),
          longitude:
            typeof coord.lng === 'number' ? coord.lng : parseFloat(coord.lng),
        }))
        .filter(coord => !isNaN(coord.latitude) && !isNaN(coord.longitude));
      setRouteCoordinates(mappedCoordinates);
      if (mappedCoordinates.length > 0) {
        const lastPoint = mappedCoordinates[mappedCoordinates.length - 1];
        setDestination(lastPoint);
      }
      if (mapRef.current && mappedCoordinates.length > 0) {
        mapRef.current.fitToCoordinates(mappedCoordinates, {
          edgePadding: {top: 50, right: 50, bottom: 50, left: 50},
          animated: true,
        });
      }
    }
  }, [coordinates]);

  const fetchCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        setCurrentLocation({latitude, longitude});
        mapRef.current?.animateCamera({
          center: {latitude, longitude},
          zoom: 18,
        });
      },
      error => console.error(error),
      {enableHighAccuracy: true},
    );
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  // Add this function after calculateDistance
  const isNearStartPoint = () => {
    if (!currentLocation || routeCoordinates.length === 0) {
      return false;
    }
    // For own route type, always return true
    if (selectedRouteType === 'OWN') {
      return true;
    }
    // Get the start point from route coordinates
    const startPoint = routeCoordinates[0];
    // Calculate distance between current location and start point
    const distanceToStart = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      startPoint.latitude,
      startPoint.longitude,
    );
    // Convert distance to meters (multiply by 1000)
    const distanceInMeters = distanceToStart * 1000;
    // Return true if within 50 meters
    return distanceInMeters <= 50;
  };

  const handleStartRace = async () => {
    if (selectedRouteType === 'DEFAULT' && !isNearStartPoint()) {
      Tts.speak('Please move to the starting point to begin the race.');
      Alert.alert(
        'Wrong Starting Position',
        'You need to be at least within 30 meters of the starting point to begin this race. Please move closer to the starting point.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('EventScreen'),
          },
        ],
      );
      return;
    }
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

    setTimeout(async () => {
      const startTime = new Date().toISOString();
      startTimeRef.current = startTime;
      try {
        // Store race start details locally for later use (like iOS)
        const raceStartDetails = {
          userId: user?.userId,
          startTime: startTime,
          eventId: eventID,
          routeType: selectedRouteType,
          category: category,
        };

        await AsyncStorage.setItem(
          'raceStartDetails',
          JSON.stringify(raceStartDetails),
        );
        console.log('Race start details stored locally:', raceStartDetails);

        startTracking();
        setTracking(true);
        setDistanceCovered(0);
        setWalkedRoute([]);
        raceEndedRef.current = false; // Reset flag for new race
        Tts.speak('Race started. Good luck!');
      } catch (error: any) {
        if (
          error.response?.status === 400 &&
          error.response?.data?.error ===
            'User has already participated in this event'
        ) {
          Alert.alert(
            'Already Participated',
            'You have already participated in this event',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {name: 'BottomTabs', params: {screen: 'StatsScreen'}},
                      ],
                    }),
                  );
                },
              },
            ],
          );
        } else {
          console.error('Error starting race:', error);
        }
      }
    }, 5000);
  };

  useEffect(() => {
    if (coordinates && coordinates.length > 1) {
      const mappedCoordinates = coordinates
        .map(coord => ({
          latitude:
            typeof coord.lat === 'number' ? coord.lat : parseFloat(coord.lat),
          longitude:
            typeof coord.lng === 'number' ? coord.lng : parseFloat(coord.lng),
        }))
        .filter(coord => !isNaN(coord.latitude) && !isNaN(coord.longitude));
      if (mappedCoordinates.length > 0) {
        setRouteCoordinates(mappedCoordinates);
        const lastPoint = mappedCoordinates[mappedCoordinates.length - 1];
        setDestination(lastPoint);
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(mappedCoordinates, {
            edgePadding: {top: 50, right: 50, bottom: 50, left: 50},
            animated: true,
          });
        }
      }
    }
  }, [coordinates]);

  const handleEndRace = async () => {
    stopDurationTimer();
    const {LocationService} = NativeModules;

    let finalData = {
      distance: distanceCoveredRef.current,
      duration: durationRef.current,
      calories: caloriesBurnedRef.current,
      avgPace: durationRef.current / distanceCoveredRef.current / 60,
      avgSpeed: distanceCoveredRef.current / (durationRef.current / 3600),
      route: walkedRouteRef.current.filter(
        (_: any, index: number) => index % 2 === 0,
      ),
    };

    try {
      // Get final data from native service and stop tracking
      const finalTrackingData = await LocationService.stopTracking();

      if (finalTrackingData) {
        // Use data from native service if available
        const finalDistance =
          finalTrackingData.distance || distanceCoveredRef.current;
        const finalDuration = finalTrackingData.duration || durationRef.current;
        const finalRoute =
          finalTrackingData.coordinates || walkedRouteRef.current;

        // Calculate final average pace (minutes per kilometer)
        const finalAvgPace = finalDuration / finalDistance / 60;

        // Calculate average speed (kilometers per hour)
        const finalAvgSpeed = finalDistance / (finalDuration / 3600);
        setAvgSpeed(finalAvgSpeed);
        avgSpeedRef.current = finalAvgSpeed;

        // Update final values
        setDistanceCovered(finalDistance);
        setDuration(finalDuration);
        setWalkedRoute(finalRoute);

        distanceCoveredRef.current = finalDistance;
        durationRef.current = finalDuration;
        walkedRouteRef.current = finalRoute;

        finalData = {
          distance: finalDistance,
          duration: finalDuration,
          calories: caloriesBurnedRef.current,
          avgPace: finalAvgPace,
          avgSpeed: finalAvgSpeed,
          route: finalRoute.filter((_: any, index: number) => index % 2 === 0),
        };

        console.log(
          'Race ended with final data from native service:',
          finalData,
        );
      }
    } catch (error) {
      console.log('Error stopping race tracking:', error);
      // Using fallback data already initialized above
    }

    const endTime = new Date().toISOString();
    endTimeRef.current = endTime;

    setModalVisible(true);
    Tts.speak(
      `Race completed. You have covered ${finalData.distance.toFixed(
        2,
      )} kilometers.`,
    );

    // Retrieve stored race start details and combine with end data for single API call (like iOS)
    try {
      let raceStartDetails = null;
      try {
        const storedDetailsStr = await AsyncStorage.getItem('raceStartDetails');
        if (storedDetailsStr) {
          raceStartDetails = JSON.parse(storedDetailsStr);
          console.log('Retrieved race start details:', raceStartDetails);
        }
      } catch (error) {
        console.error('Error retrieving race start details:', error);
      }

      // Use stored start details if available, otherwise fallback to current values
      const startUserId = raceStartDetails?.userId || user?.userId;
      const startTime =
        raceStartDetails?.startTime ||
        startTimeRef.current ||
        new Date().toISOString();
      const startEventId = raceStartDetails?.eventId || eventID;
      const startRouteType = raceStartDetails?.routeType || selectedRouteType;
      const startCategory = raceStartDetails?.category || category;

      const sessionId = `race_${Date.now()}_${startUserId}`;

      // Add single participation creation request to sync queue (combines create + update)
      await OfflineSyncService.addToSyncQueue(
        'participation_create',
        'https://ecf63b299473.ngrok-free.app/api/user/participation/create',
        {
          userId: startUserId,
          startTime: startTime,
          endTime: endTimeRef.current || new Date().toISOString(),
          eventId: startEventId,
          routeType: startRouteType,
          category: startCategory,
          distanceCovered: finalData.distance,
          duration: finalData.duration,
          caloriesBurned: finalData.calories,
          avgPace: finalData.avgPace,
          avgSpeed: finalData.avgSpeed,
          walkedRoute: finalData.route,
        },
        {
          Authorization: `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json',
        },
        sessionId,
      );

      // Also add activity creation to sync queue
      const activitySessionId = `activity_${Date.now()}_${startUserId}`;
      const activityData = {
        userId: startUserId,
        distance: finalData.distance,
        duration: finalData.duration,
        calories: finalData.calories,
        avgPace: finalData.avgPace,
        avgSpeed: finalData.avgSpeed,
        routeCoordinates: finalData.route,
        startTime: startTime,
        endTime: endTimeRef.current || new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      // Save activity data locally immediately
      await OfflineSyncService.saveActivityData({
        ...activityData,
        sessionId: activitySessionId,
        synced: false,
        syncAttempts: 0,
      });

      await OfflineSyncService.addToSyncQueue(
        'activity_create',
        'https://ecf63b299473.ngrok-free.app/api/activity/create',
        activityData,
        {
          Authorization: `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json',
        },
        activitySessionId,
      );

      // Clean up stored race start details
      await AsyncStorage.removeItem('raceStartDetails');

      console.log('Race data queued for sync - Participation and Activity');
    } catch (error) {
      console.error('Error queuing race data:', error);
    }
  };

  const handlePauseResume = async () => {
    const {LocationService} = NativeModules;

    try {
      await LocationService.pauseResumeTracking();

      if (paused) {
        setPaused(false);
        Tts.speak('Resuming race.');
      } else {
        setPaused(true);
        Tts.speak('Race paused.');
      }
    } catch (error) {
      console.log('Error toggling pause/resume:', error);
    }
  };

  useEffect(() => {
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        setCurrentLocation({latitude, longitude});
      },
      error => console.error(error),
      {enableHighAccuracy: true},
    );
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

      // Direct call to start tracking in native service with type "race", weight, and race parameters
      // Ensure all parameters are strings to avoid type casting errors
      await LocationService.startTracking(
        'race',
        weight.toString(),
        (eventID || '').toString(),
        (distance || '').toString(),
        (category || '').toString(),
      );

      // Store start location for reference
      if (currentLocation) {
        startLocation.current = currentLocation;
      }

      // Calculations are now handled directly in the polling loop above

      console.log('Native race tracking started successfully');
    } catch (error) {
      console.log('Error starting native race tracking:', error);
      Alert.alert('Error', 'Failed to start race tracking. Please try again.');
    }
  };

  const clearMap = async () => {
    setTracking(false);
    setWalkedRoute([]);
    setDistanceCovered(0);
    setDuration(0);
    setCaloriesBurned(0);
    setAvgPace(0);
    await AsyncStorage.removeItem('timestamp');
    await AsyncStorage.removeItem('duration');
    setRouteCoordinates([]);
    setDestination(null);
    if (watchId.current !== null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  const handleNavigateLeaderBoard = () => {
    clearMap();
    setModalVisible(false);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'BottomTabs', params: {screen: 'StatsScreen'}}],
      }),
    );
  };

  const handleNavigateCommunity = () => {
    clearMap();
    setModalVisible(false);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'BottomTabs', params: {screen: 'CommunityScreen'}}],
      }),
    );
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={true}
        showsMyLocationButton={true}
        initialRegion={{
          latitude: 37.78825, // Default location, will be updated by camera animation
          longitude: -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}>
        {destination && (
          <Marker coordinate={destination} title="Destination" pinColor="red" />
        )}
        {selectedRouteType === 'DEFAULT' && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={8}
            strokeColor="blue"
          />
        )}
        {walkedRoute.length > 1 && (
          <Polyline
            coordinates={walkedRoute}
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
              handleStartRace();
            }}
            text="Slide to Start"
            backgroundColor="#001965"
          />
        </View>
      )}
      {tracking && !showControls && (
        <View style={styles.sliderContainer}>
          <SlideToStart
            onSlideComplete={() => setShowControls(true)}
            text="Slide for Pause"
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
              handleEndRace();
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
              <Text style={styles.statValue}>{distanceCovered.toFixed(2)}</Text>
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
            <Text style={styles.modalTitle}>Race Completed!</Text>
            <Text style={styles.modalText}>
              Congratulations! You've completed your run.
            </Text>

            <View style={styles.modalStatsContainer}>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>
                  {distanceCoveredRef.current.toFixed(2)} km
                </Text>
                <Text style={styles.modalStatLabel}>Distance</Text>
              </View>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>
                  {formatTime(durationRef.current)}
                </Text>
                <Text style={styles.modalStatLabel}>Duration</Text>
              </View>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>
                  {caloriesBurnedRef.current.toFixed(2)} cal
                </Text>
                <Text style={styles.modalStatLabel}>Calories</Text>
              </View>
            </View>

            <Text style={styles.modalQuestion}>
              What would you like to do next?
            </Text>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.modalButtonStats}
                onPress={handleNavigateLeaderBoard}>
                <Text style={styles.modalButtonText}>View Stats</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonCommunity}
                onPress={handleNavigateCommunity}>
                <Text style={styles.modalButtonText}>Share to Community</Text>
              </TouchableOpacity>
            </View>
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
  markerContainer: {
    width: wp(8),
    height: wp(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: wp(4.3),
    height: wp(4.3),
    borderRadius: wp(4.3),
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: wp(5),
    borderRadius: wp(3),
    alignItems: 'center',
    width: wp(90),
    elevation: 5,
  },
  modalTitle: {
    fontSize: wp(6),
    fontWeight: 'bold',
    marginBottom: hp(2),
    color: '#001965',
    textAlign: 'center',
  },
  modalText: {
    fontSize: wp(4),
    marginBottom: hp(2),
    textAlign: 'center',
    color: '#333',
  },
  modalStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: hp(2),
    paddingHorizontal: wp(2),
    backgroundColor: '#f5f5f5',
    borderRadius: wp(2),
    padding: wp(3),
  },
  modalStatItem: {
    alignItems: 'center',
    flex: 1,
    padding: wp(2),
  },
  modalStatValue: {
    fontSize: wp(4.5),
    fontWeight: 'bold',
    color: '#001965',
  },
  modalStatLabel: {
    fontSize: wp(3),
    color: '#666',
    marginTop: hp(0.5),
  },
  modalQuestion: {
    fontSize: wp(4),
    marginVertical: hp(2),
    color: '#333',
    textAlign: 'center',
  },
  modalButtonsContainer: {
    flexDirection: 'column',
    width: '100%',
    marginTop: hp(1),
  },
  modalButtonStats: {
    backgroundColor: '#001965',
    padding: wp(3),
    borderRadius: wp(2),
    alignItems: 'center',
    marginBottom: hp(1.5),
    width: '100%',
  },
  modalButtonCommunity: {
    backgroundColor: '#4CAF50',
    padding: wp(3),
    borderRadius: wp(2),
    alignItems: 'center',
    width: '100%',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: wp(4),
    fontWeight: 'bold',
  },
});

export default MapScreen;
