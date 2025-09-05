/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-shadow */
import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import axios from 'axios';
import UserContext from '../context/userContext';
import {Picker} from '@react-native-picker/picker';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import LinearGradient from 'react-native-linear-gradient';
import {formatDurationDisplay} from '../utils/timeFormatter';

interface Event {
  eventId: string;
  eventName: string;
  eventStartTime: string;
  routeType: string;
}

interface EventResponse {
  events: Event[];
}

interface Ranking {
  eventName?: string;
  eventId?: string;
  rank: number;
  duration?: string;
  userId: string;
  userName?: string;
}

interface EliminationDetails {
  distanceCovered: number;
  eventId: string;
  requiredDistance: number;
  status: string;
  userId: string;
  userName: string;
}

const LeaderBoard = () => {
  const [events, setEvents] = useState<
    Array<{label: string; value: string; routeType: string}>
  >([]);
  const [loading, setLoading] = useState(true);
  const user = useContext(UserContext);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [userRankDetails, setUserRankDetails] = useState<Ranking | null>(null);
  const [eliminatedDetails, setEliminatedDetails] =
    useState<EliminationDetails | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{
    eventId: string;
    routeType: string;
  } | null>(null);
  const userid = user?.userId;
  const gender = user?.gender;

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(
          `https://ecf63b299473.ngrok-free.app/api/user/event/participated/list?userId=${userid}`,
          {
            headers: {
              Authorization: `Bearer ${user?.accessToken}`,
            },
          },
        );
        const data: EventResponse = response.data;
        const formattedEvents = data.events.map(event => ({
          label: `${event.eventName} - ${new Date(
            event.eventStartTime,
          ).toLocaleDateString()}`,
          value: event.eventId,
          routeType: event.routeType,
        }));
        console.log('events received in leaderboard', formattedEvents);
        setEvents(formattedEvents);

        // If we have events, select the first one by default
        if (formattedEvents.length > 0) {
          const firstEvent = formattedEvents[0];
          setSelectedEvent({
            eventId: firstEvent.value,
            routeType: firstEvent.routeType,
          });
          fetchRankings(firstEvent.value, firstEvent.routeType);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user?.accessToken, userid]);

  const fetchRankings = async (eventId: string, routeType: string) => {
    try {
      const response = await axios.get(
        `https://ecf63b299473.ngrok-free.app/api/user/event/rankings?userId=${userid}&eventId=${eventId}&gender=${gender}&routeType=${routeType}`,
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        },
      );
      const {top3RankedList, userEliminatedDetails, userRankDetails} =
        response.data;
      setRankings(top3RankedList || []);
      setUserRankDetails(userRankDetails || null);
      setEliminatedDetails(userEliminatedDetails || null);
    } catch (err) {
      console.error('Error fetching rankings:', err);
    }
  };

  const handleEventSelection = (itemValue: string) => {
    console.log('Selected event ID:', itemValue);
    const selected = events.find(event => event.value === itemValue);
    if (!selected) {
      return;
    }
    setSelectedEvent({eventId: selected.value, routeType: selected.routeType});
    fetchRankings(selected.value, selected.routeType);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#001965" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Leaderboard</Text>

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Select Event</Text>
        <View style={styles.pickerWrapper}>
          {Platform.OS === 'ios' ? (
            <Picker
              selectedValue={selectedEvent?.eventId}
              onValueChange={handleEventSelection}
              itemStyle={styles.pickerItemIOS}>
              {events.map(event => (
                <Picker.Item
                  key={event.value}
                  label={event.label}
                  value={event.value}
                />
              ))}
            </Picker>
          ) : (
            <Picker
              selectedValue={selectedEvent?.eventId}
              onValueChange={handleEventSelection}
              style={styles.picker}
              dropdownIconColor="#001965">
              {events.map(event => (
                <Picker.Item
                  key={event.value}
                  label={event.label}
                  value={event.value}
                />
              ))}
            </Picker>
          )}
        </View>
      </View>

      {eliminatedDetails && Object.keys(eliminatedDetails).length > 0 && (
        <View style={styles.eliminationContainer}>
          <Text style={styles.eliminationTitle}>Elimination Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={styles.detailValue}>{eliminatedDetails.status}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Distance Covered:</Text>
            <Text style={styles.detailValue}>
              {eliminatedDetails.distanceCovered.toFixed(2)} km
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Required Distance:</Text>
            <Text style={styles.detailValue}>
              {eliminatedDetails.requiredDistance.toFixed(2)} km
            </Text>
          </View>
        </View>
      )}

      {userRankDetails && Object.keys(userRankDetails).length > 0 && (
        <TouchableOpacity style={styles.userRankContainer} activeOpacity={0.9}>
          <LinearGradient
            colors={['#1a5276', '#2980b9']}
            style={styles.userRankGradient}>
            <Text style={styles.userRankTitle}>Your Performance</Text>
            <View style={styles.userRankContent}>
              <View style={styles.userRankItem}>
                <Text style={styles.userRankLabel}>Rank</Text>
                <Text style={styles.userRankValue}>{userRankDetails.rank}</Text>
              </View>
              <View style={styles.userRankDivider} />
              <View style={styles.userRankItem}>
                <Text style={styles.userRankLabel}>Duration</Text>
                <Text style={styles.userRankValue}>
                  {formatDurationDisplay(userRankDetails.duration)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <View style={styles.rankingsSection}>
        <Text style={styles.subHeader}>Top Rankings</Text>
        <FlatList
          data={rankings}
          keyExtractor={(item, index) => item.userId + index}
          renderItem={({item, index}) => (
            <View style={styles.rankItem}>
              <View style={styles.rankNumberContainer}>
                <Text style={styles.rankNumber}>{item.rank}</Text>
              </View>
              <View style={styles.rankDetails}>
                <Image
                  source={
                    index === 0
                      ? require('../assets/gold_medal.jpg')
                      : index === 1
                      ? require('../assets/silver_medal.jpg')
                      : require('../assets/bronze_medal.jpg')
                  }
                  style={styles.medalImage}
                />
                <Text style={styles.name}>{item.userName}</Text>
                <Text style={styles.time}>
                  {formatDurationDisplay(item.duration)}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={require('../assets/cup.png')}
                style={styles.emptyImage}
              />
              <Text style={styles.emptyText}>
                No rankings available for this event
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    paddingTop: 25,
    paddingBottom: hp(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: wp(4),
    color: '#001965',
    fontWeight: '500',
  },
  header: {
    fontSize: wp(5),
    fontWeight: '700',
    // textAlign: 'center',
    color: '#001965',
    fontFamily: 'apis',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 15,
  },
  pickerContainer: {
    margin: wp(4),
    marginBottom: hp(1),
  },
  pickerLabel: {
    fontSize: wp(4),
    fontWeight: '600',
    marginBottom: hp(1),
    color: '#001965',
  },
  pickerWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  picker: {
    height: hp(6),
    width: '100%',
    color: '#333',
  },
  pickerItemIOS: {
    height: hp(6),
    fontSize: 15,
    color: '#333',
  },
  eliminationContainer: {
    backgroundColor: '#fff3f3',
    margin: wp(4),
    marginTop: hp(1),
    padding: wp(4),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    elevation: 2,
    shadowColor: '#d32f2f',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  eliminationTitle: {
    fontSize: wp(4.5),
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: hp(1.5),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: hp(0.5),
  },
  detailLabel: {
    fontSize: wp(3.8),
    color: '#555',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: wp(3.8),
    color: '#d32f2f',
    fontWeight: '600',
  },
  userRankContainer: {
    margin: wp(4),
    marginTop: hp(1),
    marginBottom: hp(2),
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  userRankGradient: {
    padding: wp(4.5),
    paddingVertical: hp(2.5),
  },
  userRankTitle: {
    fontSize: wp(5),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: hp(1),
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  userRankContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: hp(10),
  },
  userRankItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: hp(5),
  },
  userRankLabel: {
    fontSize: wp(3.8),
    color: '#e0e0e0',
    marginBottom: hp(1),
    fontWeight: '500',
  },
  userRankValue: {
    fontSize: wp(5.5),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userRankDivider: {
    height: hp(6),
    width: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  rankingsSection: {
    flex: 1,
    margin: wp(4),
    marginTop: hp(1),
    marginBottom: 0,
  },
  subHeader: {
    fontSize: wp(5),
    fontWeight: '600',
    marginBottom: hp(2),
    color: '#001965',
    paddingLeft: wp(1),
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: hp(1.5),
    padding: wp(3),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rankNumberContainer: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#001965',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  rankNumber: {
    color: '#ffffff',
    fontSize: wp(4.5),
    fontWeight: 'bold',
  },
  rankDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medalImage: {
    width: wp(8),
    height: wp(8),
  },
  name: {
    flex: 1,
    fontSize: wp(4),
    fontWeight: '600',
    color: '#333',
    marginLeft: wp(2),
  },
  time: {
    fontSize: wp(3.8),
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(8),
  },
  emptyImage: {
    width: wp(20),
    height: wp(20),
    opacity: 0.5,
    marginBottom: hp(2),
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: wp(4),
    lineHeight: wp(5.5),
    fontWeight: '500',
  },
});

export default LeaderBoard;
