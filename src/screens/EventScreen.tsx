/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-catch-shadow */
import axios from 'axios';
import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import UserContext from '../context/userContext';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

const {width} = Dimensions.get('window');

type TabType = 'upcoming' | 'participated';

interface Event {
  coordinates: {lat: number | string; lng: number | string}[];
  eventId: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  distance: string;
}

interface EventResponse {
  enrolledEvents: Event[];
  nonEnrolledFinishedEvents: Event[];
  participatedEvents: Event[];
  nonEnrolledUpcomingEvents: Event[];
  message: string;
}

const fetchEnrollmentStatus = async (
  eventId: string,
  routeType: string,
  token: string,
  userId: string,
  setIsEnrolled: (value: boolean) => void,
  setIsDefaultRoute: (value: boolean) => void,
) => {
  if (eventId) {
    try {
      const response = await axios.get(
        'https://astro-api-okfis.ondigitalocean.app/api/user/enroll/check',
        {
          params: {
            userId,
            eventId,
            routeType,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      console.log('fetch enroll', response.data);
      if (response.data) {
        setIsDefaultRoute(response.data.routeType === 'DEFAULT');
        setIsEnrolled(response.data.isEnrolled);
      }
    } catch (error: any) {
      console.log('error fetch enroll status', error);
      if (error.response?.status === 400) {
        setIsEnrolled(error.response.data.isEnrolled);
      }
    }
  }
};

const EventScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useContext(UserContext);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const scrollViewRef = useRef<ScrollView>(null);
  const userid = user?.userId;
  const [nonEnrolledUpcomingEvents, setNonEnrolledUpcomingEvents] = useState<
    Event[]
  >([]);
  const [participatedEvents, setParticipatedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  // const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [showEnrollPopup, setShowEnrollPopup] = useState<boolean>(false);
  const [isDefaultRoute, setIsDefaultRoute] = useState<boolean>(false);
  // const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const eventIn = user?.insideOutside;

  const TabBar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
        onPress={() => {
          setActiveTab('upcoming');
          scrollViewRef.current?.scrollTo({x: width, animated: true});
        }}>
        <Text
          style={[
            styles.tabText,
            activeTab === 'upcoming' && styles.activeTabText,
          ]}>
          This Week
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'participated' && styles.activeTab]}
        onPress={() => {
          setActiveTab('participated');
          scrollViewRef.current?.scrollTo({x: width * 2, animated: true});
        }}>
        <Text
          style={[
            styles.tabText,
            activeTab === 'participated' && styles.activeTabText,
          ]}>
          Completed
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const handleGoToStats = () => {
    setShowEnrollPopup(false);
    if (selectedEvent) {
      navigation.navigate('BottomTabs', {
        screen: 'StatsScreen',
      });
      setSelectedEvent(null);
    }
  };

  const fetchEvents = useCallback(async (token: string, userid: string) => {
    setLoading(true);
    console.log('user id', userid);
    try {
      const response = await axios.get(
        `https://astro-api-okfis.ondigitalocean.app/api/user/event/details?userId=${userid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      console.log('events', response.data);
      const data: EventResponse = response.data;

      if (response.data) {
        setLoading(false);
      }

      const enrolledAndUpcoming = [
        ...(data.enrolledEvents || []),
        ...(data.nonEnrolledUpcomingEvents || []),
      ];
      setNonEnrolledUpcomingEvents(enrolledAndUpcoming);
      setParticipatedEvents(data.participatedEvents || []);
    } catch (err: any) {
      console.log('event error', err?.response?.message);
      // setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []); // Ensure dependencies are added if necessary

  useFocusEffect(
    useCallback(() => {
      if (user?.accessToken && userid) {
        fetchEvents(user.accessToken, userid);
      }
    }, [user?.accessToken, userid, fetchEvents]),
  );

  // Update the handleEventPress function and its dependencies
  // Modify handleEventPress to always fetch enrollment status
  useFocusEffect(
    useCallback(() => {
      if (user?.accessToken && userid) {
        fetchEvents(user.accessToken, userid);
      }

      // Reset states when screen gains focus
      setSelectedEvent(null);
      setShowEnrollPopup(false);
      setIsEnrolled(null);
      setIsDefaultRoute(false);

      return () => {
        // Cleanup if necessary
      };
    }, [user?.accessToken, userid, fetchEvents]),
  );

  const handleEnroll = useCallback(
    async (eventId: string) => {
      if (eventId && user?.insideOutside) {
        try {
          const response = await axios.post(
            'https://astro-api-okfis.ondigitalocean.app/api/user/enroll/create',
            {
              userId: userid,
              eventId: eventId,
              routeType: user?.insideOutside,
              category: user?.gender,
            },
            {
              headers: {
                Authorization: `Bearer ${user?.accessToken}`,
              },
            },
          );
          if (response.status === 201) {
            if (user?.accessToken && userid) {
              fetchEvents(user.accessToken, userid);
            }
            Alert.alert(
              'Enroll Successful',
              'You have been enrolled in the event.',
            );
          }
        } catch (error: any) {
          if (error.response && error.response.status === 400) {
            if (user?.accessToken && userid) {
              fetchEvents(user.accessToken, userid);
            }
          } else {
            console.error('Error enrolling in the event:', error);
            Alert.alert('Error', 'Failed to enroll in the event.');
          }
        } finally {
          setShowEnrollPopup(false);
          setSelectedEvent(null);
        }
      }
    },
    [user, userid, fetchEvents],
  );

  const handleEventPress = useCallback(
    (event: Event) => {
      setSelectedEvent(event);
      setShowEnrollPopup(true);
      setIsEnrolled(null); // Reset enrollment status before fetching new one

      if (user?.accessToken && userid && user?.insideOutside) {
        fetchEnrollmentStatus(
          event.eventId,
          user.insideOutside,
          user.accessToken,
          userid,
          setIsEnrolled,
          setIsDefaultRoute,
        );
      }
    },
    [user?.accessToken, userid, user?.insideOutside],
  );

  // Add this useEffect to handle modal state
  useEffect(() => {
    if (!showEnrollPopup) {
      setSelectedEvent(null);
      setIsEnrolled(null);
      setIsDefaultRoute(false);
    }
  }, [showEnrollPopup]);

  useEffect(() => {
    if (user?.insideOutside === 'DEFAULT') {
      setIsDefaultRoute(true);
    } else {
    }
  }, [user?.insideOutside]);

  const isWithinStartWindow = (
    startTime: string,
  ): {canStart: boolean; minutesUntilStart: number} => {
    // Create Date objects and get IST time
    const eventStart = new Date(startTime);
    const now = new Date();

    // Convert to IST by adding 5 hours and 30 minutes offset
    const ISTOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const nowIST = new Date(now.getTime() + ISTOffset);

    // Calculate time difference in minutes
    const timeDiff = eventStart.getTime() - nowIST.getTime();
    const minutesUntilStart = Math.floor(timeDiff / (1000 * 60));

    // Allow starting if within 10 minutes before start time
    const canStart = minutesUntilStart <= 10 && minutesUntilStart >= -30;

    return {
      canStart,
      minutesUntilStart,
    };
  };

  const handleSearchRoute = () => {
    setShowEnrollPopup(false);
    if (selectedEvent && user?.gender) {
      const {canStart, minutesUntilStart} = isWithinStartWindow(
        selectedEvent.startTime,
      );

      if (canStart) {
        navigation.navigate('MapScreen', {
          coordinates: selectedEvent.coordinates,
          eventID: selectedEvent.eventId,
          distance: selectedEvent.distance,
          category: user?.gender, // Now guaranteed to be string
        });
        setSelectedEvent(null);
      } else {
        if (minutesUntilStart > 10) {
          Alert.alert(
            'Race not started yet',
            'Please wait until 10 minutes before the race start time.',
          );
        } else if (minutesUntilStart < -30) {
          Alert.alert(
            'Race already started',
            'The scheduled start time has passed.',
          );
        }
      }
    }
  };

  const handleOwnRoute = () => {
    setShowEnrollPopup(false);
    if (selectedEvent && user?.gender) {
      const {canStart, minutesUntilStart} = isWithinStartWindow(
        selectedEvent.startTime,
      );

      if (canStart) {
        navigation.navigate('MapScreen', {
          coordinates: [{lat: 'own', lng: 'own'}],
          eventID: selectedEvent.eventId,
          distance: selectedEvent.distance,
          category: user.gender, // Now guaranteed to be string
        });
        setSelectedEvent(null);
      } else {
        if (minutesUntilStart > 10) {
          Alert.alert(
            'Race not started yet',
            ' Please wait until 10 minutes before the race start time.',
          );
        } else if (minutesUntilStart < -30) {
          Alert.alert(
            'Race already started',
            'The scheduled start time has passed.',
          );
        }
      }
    }
  };
  const filterEventsByType = (events: Event[]) => {
    if (user?.insideOutside === 'DEFAULT') {
      return events.filter(event =>
        event.name.toLowerCase().includes('manayata'),
      );
    } else if (user?.insideOutside === 'OWN') {
      return events.filter(
        event => !event.name.toLowerCase().includes('manayata'),
      );
    }
    return events;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getUTCDate().toString().padStart(2, '0')}/${(
      date.getUTCMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${date.getUTCFullYear()} ${date
      .getUTCHours()
      .toString()
      .padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
  };
  const renderEventList = (events: Event[], title: string) => (
    <View style={[styles.section, {flex: 1}]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {events.length === 0 ? (
        <View style={{flex: 1, justifyContent: 'center'}}>
          <Text style={styles.noEventsText}>No events found.</Text>
        </View>
      ) : (
        <View style={{flex: 1}}>
          {events.map(event => {
            const eventDate = new Date(event.startTime);
            const today = new Date();
            const isUpcoming = eventDate > today;

            return (
              <TouchableOpacity
                key={event.eventId}
                onPress={() => handleEventPress(event)}
                style={[
                  styles.eventCardWrapper,
                  {minHeight: Math.min(CARD_HEIGHT, 150)}, // Ensures minimum height
                ]}>
                <ImageBackground
                  source={require('../assets/legbackground.png')}
                  style={styles.eventCardBackground}
                  imageStyle={styles.eventCardImage}>
                  <View style={styles.eventContent}>
                    {eventIn !== 'OWN' && (
                      <Image
                        source={require('../assets/Novohealthlogo.png')}
                        style={styles.logoImage}
                      />
                    )}
                    <Text style={styles.dateText}>
                      {eventDate.toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text
                      style={[
                        styles.statusText,
                        isUpcoming
                          ? styles.upcomingStatus
                          : styles.completedStatus,
                      ]}>
                      {isUpcoming ? 'Upcoming' : 'Completed'}
                    </Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingIconContainer}>
          <ActivityIndicator size="large" color="#001965" />
        </View>
      </View>
    );
  }

  // if (error) {
  //   return (
  //     <View style={styles.container}>
  //       <Text style={styles.errorText}>Error: {error}</Text>
  //     </View>
  //   );
  // }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Events Schedule</Text>
      <TabBar />

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const offset = e.nativeEvent.contentOffset.x;
          const page = Math.round(offset / width);
          const tabs: TabType[] = ['upcoming', 'participated'];
          setActiveTab(tabs[page]);
        }}>
        <View style={styles.page}>
          {renderEventList(
            filterEventsByType(nonEnrolledUpcomingEvents),
            'This Week',
          )}
        </View>
        <View style={styles.page}>
          {renderEventList(
            filterEventsByType(participatedEvents),
            'Completed Events',
          )}
        </View>
      </ScrollView>

      <Modal visible={showEnrollPopup} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedEvent && (
              <>
                <Text style={styles.modalTitle}>Event Details</Text>
                <View style={styles.eventDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Event Name:</Text>
                    <Text style={styles.value}>{selectedEvent.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Description:</Text>
                    <Text style={styles.value}>
                      {selectedEvent.description}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Distance:</Text>
                    <Text style={styles.value}>
                      {selectedEvent.distance || 'N/A'} km
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Date:</Text>
                    <Text style={styles.value}>
                      {formatDateTime(selectedEvent.startTime)} -{' '}
                      {formatDateTime(selectedEvent.endTime)}
                    </Text>
                  </View>
                </View>

                {new Date(selectedEvent.endTime) > new Date() ? (
                  <>
                    {isEnrolled ? (
                      <>
                        {isEnrolled &&
                          !participatedEvents.some(
                            event => event.eventId === selectedEvent.eventId,
                          ) && (
                            <Text style={styles.modalText}>
                              You are already enrolled in this event.
                            </Text>
                          )}

                        {participatedEvents.some(
                          event => event.eventId === selectedEvent.eventId,
                        ) ? (
                          <View>
                            <Text style={styles.modalText}>
                              You Completed the race
                            </Text>
                            <TouchableOpacity
                              style={[
                                styles.startButton,
                                {backgroundColor: '#2196F3'},
                              ]}
                              onPress={handleGoToStats}>
                              <Text style={styles.buttonText}>Go to Stats</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => {
                              if (selectedEvent?.eventId) {
                                isDefaultRoute
                                  ? handleSearchRoute()
                                  : handleOwnRoute();
                              }
                            }}>
                            <Text style={styles.buttonText}>Start</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <TouchableOpacity
                        style={styles.enrollButton}
                        onPress={() => {
                          if (selectedEvent) {
                            handleEnroll(selectedEvent.eventId);
                          }
                        }}>
                        <Text style={styles.buttonText}>Enroll</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <Text style={styles.modalText}>
                    This event has already been completed.
                  </Text>
                )}
              </>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEnrollPopup(false)}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_HEIGHT * 0.22; // 22% of screen height
const CARD_MARGIN = SCREEN_WIDTH * 0.04;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  tab: {
    paddingHorizontal: 40,
    paddingVertical: 9,
    marginHorizontal: 5,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
  },
  activeTab: {
    backgroundColor: '#001965',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    fontFamily: 'apis',
  },
  activeTabText: {
    color: '#fff',
  },
  page: {
    width: width,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 16,
    textAlign: 'center',
    color: '#001965',
    fontFamily: 'apis',
  },
  section: {
    marginBottom: SCREEN_HEIGHT * 0.03,
    paddingHorizontal: SCREEN_WIDTH * 0.04,
  },

  sectionTitle: {
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: '600',
    marginBottom: SCREEN_HEIGHT * 0.01,
    color: '#555',
  },
  noEventsText: {
    fontSize: SCREEN_WIDTH * 0.035,
    color: '#888',
    textAlign: 'center',
    marginTop: SCREEN_HEIGHT * 0.01,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
  },
  eventCardWrapper: {
    width: '100%',
    height: CARD_HEIGHT,
    marginBottom: CARD_MARGIN,
    borderRadius: SCREEN_WIDTH * 0.2, // 2% of screen width
  },

  eventCardBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  eventContent: {
    position: 'absolute',
    width: '100%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SCREEN_WIDTH * 0.02,
  },

  eventCardImage: {
    width: '100%',
    height: '88%',
    borderRadius: 8,
  },

  logoImage: {
    position: 'absolute',
    top: -(CARD_HEIGHT * 0.22),
    left: -(SCREEN_WIDTH * 0.07),
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.35,
    resizeMode: 'contain',
  },
  dateText: {
    fontSize: SCREEN_WIDTH * 0.07, // 7% of screen width
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  statusText: {
    fontSize: SCREEN_WIDTH * 0.04, // 4% of screen width
    fontWeight: 'bold',
    paddingVertical: SCREEN_HEIGHT * 0.005,
    paddingHorizontal: SCREEN_WIDTH * 0.02,
    borderRadius: 4,
    textAlign: 'center',
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.015,
  },
  upcomingStatus: {
    color: '#fff',
    backgroundColor: 'rgba(247, 62, 62, 0)',
    fontStyle: 'italic',
  },
  completedStatus: {
    color: 'black',
    backgroundColor: 'rgba(220, 53, 70, 0)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
    lineHeight: 24,
    marginTop: 15,
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001965',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
    gap: 10,
  },
  enrollButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    elevation: 2,
  },
  closeButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    marginTop: 5,
    elevation: 2,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  eventDetails: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  value: {
    color: '#333',
    flex: 2,
  },
  errorText: {
    color: 'red',
  },
  loadingIconContainer: {
    flex: 1,
  },
});

export default EventScreen;
