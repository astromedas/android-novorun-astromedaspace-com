/* eslint-disable react-hooks/exhaustive-deps */
import React, {useContext, useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import httpClient from '../utils/httpClient';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import UserContext from '../context/userContext';
import {BackHandler} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BottomTabParamList} from '../../App';
import OfflineSyncService from '../utils/OfflineSyncService';
import NetInfo from '@react-native-community/netinfo';
// import {Dimensions} from 'react-native';

// Import custom components
import ActivityMap from '../components/statscomponents/ActivityMap';
import ActivityStats from '../components/statscomponents/ActivityStats';
import WeekSelector from '../components/statscomponents/WeekSelector';
import WeeklySummary from '../components/statscomponents/WeeklySummary';

// const {width, height} = Dimensions.get('window');

interface StatsData {
  id: string;
  startTime: string;
  distanceCovered: number;
  duration: number;
  avgPace: number;
  caloriesBurned: number;
  coordinates: {latitude: number; longitude: number}[];
  activities?: {
    id: string;
    startTime: string;
    distanceCovered: number;
    duration: number;
    avgPace: number;
    caloriesBurned: number;
    coordinates: {latitude: number; longitude: number}[];
    activityTime?: string;
  }[];
}

interface EventData {
  id: string;
  eventName: string;
  startTime: string;
}

interface WeekRange {
  startDate: string;
  endDate: string;
}

type leaderboardnavigation = NativeStackNavigationProp<
  BottomTabParamList,
  'LeaderBoard'
>;

export default function StatsScreen() {
  const navigation = useNavigation<leaderboardnavigation>();
  const user = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('activity');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStat, setSelectedStat] = useState<StatsData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [statsType, setStatsType] = useState<'today' | 'weekly'>('today');
  const [weekSelection, setWeekSelection] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth(),
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [monthSelection, setMonthSelection] = useState(false);
  const [weekRanges, setWeekRanges] = useState<WeekRange[]>([]);
  
  // Sync-related state variables
  const [syncStatus, setSyncStatus] = useState({ synced: false, pending: true, attempts: 0 });
  const [pendingActivities, setPendingActivities] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Calculate week ranges for the selected month
  useEffect(() => {
    calculateWeekRanges(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const calculateWeekRanges = (month: number, year: number) => {
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();
    const ranges: WeekRange[] = [];

    for (let startDay = 1; startDay <= lastDate; startDay += 7) {
      const endDay = Math.min(startDay + 6, lastDate);
      const startDateObj = new Date(year, month, startDay);
      const endDateObj = new Date(year, month, endDay);
      ranges.push({
        startDate: startDateObj.toISOString().split('T')[0],
        endDate: endDateObj.toISOString().split('T')[0],
      });
    }

    setWeekRanges(ranges);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    // Past months/years should have all weeks available
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      setAvailableWeeks(Array.from({length: ranges.length}, (_, i) => i + 1));
      return;
    }

    // Future months/years should have no weeks available
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      setAvailableWeeks([]);
      return;
    }

    // For current month, find which weeks should be available
    if (year === currentYear && month === currentMonth) {
      // Find which week contains today
      let currentWeekIndex = -1;

      for (let i = 0; i < ranges.length; i++) {
        const startDate = new Date(ranges[i].startDate);
        const endDate = new Date(ranges[i].endDate);

        if (
          currentDate >= startDate.getDate() &&
          currentDate <= endDate.getDate()
        ) {
          currentWeekIndex = i;
          break;
        }
      }

      // Make all weeks up to and including the current week available
      if (currentWeekIndex >= 0) {
        const availableWeeks = Array.from(
          {length: currentWeekIndex + 1},
          (_, i) => i + 1,
        );
        setAvailableWeeks(availableWeeks);

        // Automatically select the current week if no week is selected
        if (!selectedWeek) {
          setSelectedWeek(currentWeekIndex + 1);
        }
      } else {
        // If we couldn't find the current week, make all weeks available
        // (this is a fallback and shouldn't normally happen)
        setAvailableWeeks(Array.from({length: ranges.length}, (_, i) => i + 1));
      }
    }
  };

  const fetchTodayStats = async (userId: string) => {
    setLoading(true);
    try {
      const response = await httpClient.get(`/activity/today?userId=${userId}`);
      console.log('today activity', response.data);

      if (response.data.activities && response.data.activities.length > 0) {
        // Store individual activities
        const activities = response.data.activities.map((act: any) => ({
          id: act.id || `activity-${new Date().getTime()}-${Math.random()}`,
          startTime: act.startTime,
          distanceCovered: act.totalDistanceCovered || 0,
          duration: act.duration || 0,
          avgPace: act.avgPace || 0,
          caloriesBurned: act.caloriesBurned || 0,
          coordinates: act.coordinates || [],
          activityTime: act.activityTime,
        }));

        // Calculate total stats from all activities (for summary display)
        const totalDistance =
          response.data.totalDistance ||
          activities.reduce(
            (sum: number, act: any) => sum + (act.distanceCovered || 0),
            0,
          );

        const totalDuration =
          response.data.totalDuration ||
          activities.reduce(
            (sum: number, act: any) => sum + (act.duration || 0),
            0,
          );

        const totalCalories =
          response.data.totalCalories ||
          activities.reduce(
            (sum: number, act: any) => sum + (act.caloriesBurned || 0),
            0,
          );

        const avgPace =
          response.data.avgPace ||
          (totalDistance > 0 ? totalDuration / totalDistance : 0);

        // Set the stats with both individual activities and summary
        setStats({
          id: 'today',
          startTime: new Date().toISOString(),
          distanceCovered: totalDistance,
          duration: totalDuration,
          avgPace: avgPace,
          caloriesBurned: totalCalories,
          coordinates: [], // We'll use individual activity coordinates when needed
          activities: activities, // Add the activities array to the stats object
        });
      } else if (response.data.data) {
        // Handle single activity case
        const todayStat = {
          id: response.data.data.eventId || 'today',
          startTime: response.data.data.startTime || new Date().toISOString(),
          distanceCovered: response.data.data.distanceCovered ?? 0,
          duration: response.data.data.duration ?? 0,
          avgPace: response.data.data.avgPace ?? 0,
          caloriesBurned: response.data.data.caloriesBurned ?? 0,
          coordinates: response.data.data.participatingcoordinates || [],
          activities: [], // Empty activities array for consistency
        };
        setStats(todayStat);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('Error fetching today stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyStats = async (
    userId: string,
    week: number,
  ) => {
    setLoading(true);
    try {
      if (week !== null && week > 0 && week <= weekRanges.length) {
        const weekRange = weekRanges[week - 1];
        const response = await httpClient.get(`/activity/activities?userId=${userId}&startDate=${weekRange.startDate}&endDate=${weekRange.endDate}&type=weekly`);
        console.log('weekly report', response.data);
        setWeeklyStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
      setWeeklyStats(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventsList = async (userId: string) => {
    setLoading(true);
    try {
      const response = await httpClient.get(
        `/user/stats/eventlist?userId=${userId}`
      );
      console.log('event id from fitrst', response.data);
      const formattedEvents = response.data.data.map((event: any) => ({
        id: event.eventId,
        eventName: event.name,
        startTime: event.startTime,
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventStats = async (eventId: string) => {
    console.log('event id', eventId);
    setLoading(true);
    try {
      const response = await httpClient.get(
        `/user/stats/details?eventId=${eventId}&userId=${user?.userId}`
      );
      console.log('stats for events', response.data);

      // Check if data exists and has the expected structure
      if (
        response.data.success &&
        response.data.data &&
        response.data.data.length > 0
      ) {
        // Get the first item from the data array
        const eventData = response.data.data[0];

        const eventStat = {
          id: eventId,
          startTime: eventData.startTime,
          distanceCovered: eventData.distanceCovered ?? 0,
          duration: eventData.duration ?? 0,
          avgPace: eventData.avgPace ?? 0,
          caloriesBurned: eventData.caloriesBurned ?? 0,
          coordinates: eventData.participatingcoordinates || [],
          routeType: eventData.routeType,
          category: eventData.Category,
          // Add any other fields you need
        };

        setSelectedStat(eventStat);
        setModalVisible(true);
      } else {
        console.error('No event data found or invalid data structure');
      }
    } catch (error) {
      console.error('Error fetching event stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sync-related functions
  const loadPendingActivities = async () => {
    try {
      const pending = await OfflineSyncService.getAllPendingActivities();
      setPendingActivities(pending);
      console.log('Loaded pending activities (offline safe):', pending.length);
    } catch (error) {
      console.error('Error loading pending activities:', error);
      setPendingActivities([]);
    }
  };

  const checkSyncStatus = async () => {
    if (user?.userId) {
      try {
        const sessionId = `${user.userId}_${new Date().toISOString().split('T')[0]}`;
        const status = await OfflineSyncService.getSyncStatus(sessionId);
        setSyncStatus(status);
      } catch (error) {
        console.error('Error checking sync status:', error);
        setSyncStatus({ synced: false, pending: true, attempts: 0 });
      }
    }
  };

  const checkNetworkConnection = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      setIsConnected(netInfo.isConnected ?? false);
      return netInfo.isConnected ?? false;
    } catch (error) {
      console.error('Error checking network:', error);
      setIsConnected(false);
      return false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('LeaderBoard');
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [navigation]),
  );

  useFocusEffect(
    useCallback(() => {
      if (user?.userId && user.accessToken) {
        if (activeTab === 'activity') {
          if (statsType === 'today') {
            fetchTodayStats(user.userId);
          } else if (statsType === 'weekly' && selectedWeek) {
            fetchWeeklyStats(user.userId, selectedWeek);
          }
        } else {
          fetchEventsList(user.userId);
        }
      }
    }, [
      user?.userId,
      user?.accessToken,
      activeTab,
      statsType,
      selectedWeek,
      weekRanges,
    ]),
  );

  // Sync monitoring effect
  useEffect(() => {
    const monitorSync = async () => {
      await checkNetworkConnection();
      await loadPendingActivities();
      await checkSyncStatus();
    };

    // Initial check
    monitorSync();

    // Set up periodic monitoring (every 5 seconds like iOS)
    const interval = setInterval(() => {
      loadPendingActivities(); // Always check for pending activities
      checkSyncStatus(); // Check sync status when possible
    }, 5000);

    // Set up network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      if (state.isConnected) {
        console.log('🌐 Network connected, checking sync status');
        checkSyncStatus();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [user?.userId]);

  const handleViewTodayStats = () => {
    if (stats) {
      setSelectedStat(stats);
      setModalVisible(true);
    }
  };

  const handleEventClick = (eventId: string) => {
    if (user?.accessToken) {
      console.log('event id', eventId);
      console.log('event id token', user?.accessToken);

      fetchEventStats(eventId);
    }
  };

  const handleStatsTypeChange = (type: 'today' | 'weekly') => {
    setStatsType(type);
    if (type === 'weekly') {
      setWeekSelection(true);
    } else {
      setWeekSelection(false);
      if (user?.userId && user.accessToken) {
        fetchTodayStats(user.userId);
      }
    }
  };

  const handleWeekSelect = (week: number) => {
    setSelectedWeek(week);
    setWeekSelection(false);
    if (user?.userId && user.accessToken) {
      fetchWeeklyStats(user.userId, week);
    }
  };

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    setMonthSelection(false);
    setSelectedWeek(null);
    setWeekSelection(true);
  };

  const handleYearChange = (increment: number) => {
    setSelectedYear(prev => prev + increment);
  };

  const renderMonthSelector = () => {
    return (
      <View style={styles.monthSelector}>
        <View style={styles.yearSelector}>
          <TouchableOpacity
            style={styles.yearButton}
            onPress={() => handleYearChange(-1)}>
            <Text style={styles.yearButtonText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.yearText}>{selectedYear}</Text>
          <TouchableOpacity
            style={styles.yearButton}
            onPress={() => handleYearChange(1)}>
            <Text style={styles.yearButtonText}>▶</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.monthTitle}>Select Month</Text>
        <View style={styles.monthsContainer}>
          {months.map((month, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.monthButton,
                selectedMonth === index && styles.activeMonthButton,
                // Disable future months in current year
                selectedYear === new Date().getFullYear() &&
                  index > new Date().getMonth() &&
                  styles.disabledMonthButton,
                // Disable all months in future years
                selectedYear > new Date().getFullYear() &&
                  styles.disabledMonthButton,
              ]}
              disabled={
                (selectedYear === new Date().getFullYear() &&
                  index > new Date().getMonth()) ||
                selectedYear > new Date().getFullYear()
              }
              onPress={() => handleMonthSelect(index)}>
              <Text
                style={[
                  styles.monthButtonText,
                  selectedMonth === index && styles.activeMonthButtonText,
                  ((selectedYear === new Date().getFullYear() &&
                    index > new Date().getMonth()) ||
                    selectedYear > new Date().getFullYear()) &&
                    styles.disabledMonthButtonText,
                ]}>
                {month}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setMonthSelection(false)}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTodayStats = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#0000ff" />;
    }

    if (!stats) {
      return <Text style={styles.emptyText}>No activity data for today</Text>;
    }

    // Format time for display
    const formatTime = (timeString: string) => {
      if (!timeString) {
        return '';
      }
      const date = new Date(timeString);
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    };

    return (
      <View style={styles.todayStatsContainer}>
        <Text style={styles.todayTitle}>Today's Activity</Text>

        {/* Summary Card */}
        <View style={styles.todaySummaryCard}>
          <Text style={styles.summaryTitle}>Daily Summary</Text>
          <ActivityStats
            duration={stats.duration}
            distanceCovered={stats.distanceCovered}
            caloriesBurned={stats.caloriesBurned}
            avgPace={stats.avgPace}
            compact={true}
          />
        </View>

        {/* Individual Activities */}
        {stats.activities && stats.activities.length > 0 ? (
          <View style={styles.activitiesList}>
            <Text style={styles.activitiesTitle}>Activities</Text>
            {stats.activities.map((activity, index) => (
              <TouchableOpacity
                key={activity.id || index}
                style={styles.activityItem}
                onPress={() => {
                  setSelectedStat(activity);
                  setModalVisible(true);
                }}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTime}>
                    {formatTime(activity.startTime)}
                  </Text>
                  <Text style={styles.activityDuration}>
                    {Math.floor(activity.duration / 60)}:
                    {(activity.duration % 60).toString().padStart(2, '0')} min
                  </Text>
                </View>

                <View style={styles.activityDetails}>
                  <View style={styles.activityDetail}>
                    <Text style={styles.detailValue}>
                      {activity.distanceCovered.toFixed(2)}
                    </Text>
                    <Text style={styles.detailLabel}>km</Text>
                  </View>

                  <View style={styles.activityDetail}>
                    <Text style={styles.detailValue}>
                      {activity.caloriesBurned.toFixed(1)}
                    </Text>
                    <Text style={styles.detailLabel}>cal</Text>
                  </View>

                  <View style={styles.activityDetail}>
                    <Text style={styles.detailValue}>
                      {activity.avgPace.toFixed(2)}
                    </Text>
                    <Text style={styles.detailLabel}>min/km</Text>
                  </View>
                </View>

                <Text style={styles.viewRouteText}>View Walked Route</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={handleViewTodayStats}>
            <Text style={styles.viewDetailsText}>Walked route</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderActivityStats = () => {
    if (monthSelection) {
      return renderMonthSelector();
    }

    if (weekSelection) {
      return (
        <WeekSelector
          weekRanges={weekRanges}
          availableWeeks={availableWeeks}
          selectedWeek={selectedWeek}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          months={months}
          onWeekSelect={handleWeekSelect}
          onMonthSelect={() => {
            setWeekSelection(false);
            setMonthSelection(true);
          }}
          onBack={() => {
            setWeekSelection(false);
            if (user?.userId && user.accessToken) {
              fetchTodayStats(user.userId);
            }
            setStatsType('today');
          }}
        />
      );
    }

    // For weekly stats or today stats, use ScrollView
    return (
      <ScrollView>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              statsType === 'today' && styles.activeTypeButton,
            ]}
            onPress={() => handleStatsTypeChange('today')}>
            <Text
              style={[
                styles.typeButtonText,
                statsType === 'today' && styles.activeTypeButtonText,
              ]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              statsType === 'weekly' && styles.activeTypeButton,
            ]}
            onPress={() => handleStatsTypeChange('weekly')}>
            <Text
              style={[
                styles.typeButtonText,
                statsType === 'weekly' && styles.activeTypeButtonText,
              ]}>
              Weekly
            </Text>
          </TouchableOpacity>
        </View>

        {statsType === 'weekly' && selectedWeek ? (
          loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <WeeklySummary data={weeklyStats} />
          )
        ) : (
          renderTodayStats()
        )}
      </ScrollView>
    );
  };

  const renderEventStats = () => {
    return (
      <View style={styles.tabContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <FlatList
            data={events}
            keyExtractor={item => item.id}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.eventItem}
                onPress={() => handleEventClick(item.id)}>
                <Text style={styles.eventName}>{item.eventName}</Text>
                <Text style={styles.eventDate}>
                  {new Date(item.startTime).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No events found</Text>
            }
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.statsTitle}>Stats</Text>
      
      {/* Sync Status Section */}
      {!isConnected && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>📶 Offline Mode</Text>
        </View>
      )}
      
      {!syncStatus.synced && syncStatus.pending && (
        <Text style={styles.syncMessage}>
          Not synced yet. Waiting for connection. Your data will be stored soon.
        </Text>
      )}

      {/* Pending Activities Section */}
      {pendingActivities.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingSectionTitle}>
            📤 Activities Waiting to Sync ({pendingActivities.length})
          </Text>
          {pendingActivities.map((pending, index) => (
            <View key={pending.sessionId || index} style={styles.pendingActivityItem}>
              <View style={styles.pendingActivityHeader}>
                <Text style={styles.pendingActivityTime}>
                  {new Date(pending.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <View style={styles.pendingSyncBadge}>
                  <Text style={styles.pendingSyncBadgeText}>
                    {pending.syncAttempts > 0 ? `Syncing... (${pending.syncAttempts})` : 'Pending'}
                  </Text>
                </View>
              </View>
              <View style={styles.pendingActivityStats}>
                <Text style={styles.pendingStatText}>{(pending.distance || 0).toFixed(2)} km</Text>
                <Text style={styles.pendingStatText}>{(() => {
                  const totalSeconds = Math.floor(pending.duration || 0);
                  const hours = Math.floor(totalSeconds / 3600);
                  const minutes = Math.floor((totalSeconds % 3600) / 60);
                  const seconds = totalSeconds % 60;
                  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                })()}</Text>
                <Text style={styles.pendingStatText}>{(pending.calories || 0).toFixed(0)} cal</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
          onPress={() => setActiveTab('activity')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'activity' && styles.activeTabText,
            ]}>
            Activity Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'event' && styles.activeTab]}
          onPress={() => setActiveTab('event')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'event' && styles.activeTabText,
            ]}>
            Event Stats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conditional rendering based on active tab */}
      {activeTab === 'activity' ? (
        <ScrollView style={styles.scrollContainer}>
          {renderActivityStats()}
        </ScrollView>
      ) : (
        <View style={styles.scrollContainer}>{renderEventStats()}</View>
      )}

      {/* Stats Detail Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          {selectedStat && (
            <ScrollView style={styles.modalScrollView}>
              <ActivityStats
                duration={selectedStat.duration}
                distanceCovered={selectedStat.distanceCovered}
                caloriesBurned={selectedStat.caloriesBurned}
                avgPace={selectedStat.avgPace}
              />

              {selectedStat.coordinates &&
              selectedStat.coordinates.length > 0 ? (
                <ActivityMap
                  coordinates={selectedStat.coordinates}
                  height={300}
                />
              ) : (
                <Text style={styles.noRouteText}>No route data available</Text>
              )}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 41,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#002366',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#e6eaf0',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#002366',
  },
  tabText: {
    fontWeight: '500',
    color: '#002366',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#e6eaf0',
    overflow: 'hidden',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTypeButton: {
    backgroundColor: '#002366',
  },
  typeButtonText: {
    fontWeight: '500',
    color: '#002366',
  },
  activeTypeButtonText: {
    color: '#fff',
  },
  todayStatsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginTop: 25,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#002366',
    marginTop: 25,
  },
  todayStatsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 25,
  },
  viewDetailsButton: {
    backgroundColor: '#002366',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  viewDetailsText: {
    color: '#fff',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 24,
  },
  eventItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002366',
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  modalScrollView: {
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#002366',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeText: {
    color: '#fff',
    fontWeight: '500',
  },
  noRouteText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginTop: 0,
  },
  chartTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#002366',
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  weekSummary: {
    backgroundColor: '#f0f4fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e6f2',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#002366',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateRangeText: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  summaryText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#002366',
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryValue: {
    fontWeight: 'bold',
    color: '#002366',
    marginLeft: 'auto',
  },
  summaryMetric: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryCardTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002366',
  },
  summaryCardUnit: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e6eaf0',
    borderRadius: 4,
    marginTop: 8,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#4287f5',
  },

  monthSelector: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearButton: {
    padding: 8,
    backgroundColor: '#e6eaf0',
    borderRadius: 4,
  },
  yearButtonText: {
    color: '#002366',
    fontSize: 16,
  },
  yearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002366',
    marginHorizontal: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002366',
    marginBottom: 12,
    textAlign: 'center',
  },
  monthsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: '30%',
    backgroundColor: '#e6eaf0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  activeMonthButton: {
    backgroundColor: '#002366',
  },
  disabledMonthButton: {
    backgroundColor: '#f0f0f0',
    opacity: 0.5,
  },
  monthButtonText: {
    color: '#002366',
    fontWeight: '500',
  },
  activeMonthButtonText: {
    color: '#fff',
  },
  disabledMonthButtonText: {
    color: '#999',
  },
  backButton: {
    backgroundColor: '#002366',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  // Add these styles to the existing StyleSheet
  todaySummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activitiesList: {
    marginTop: 8,
  },
  activitiesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002366',
    marginBottom: 8,
  },
  activityItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#002366',
  },
  activityDuration: {
    fontSize: 14,
    color: '#666',
  },
  activityDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activityDetail: {
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002366',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  viewRouteText: {
    fontSize: 14,
    color: '#002366',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Sync-related styles
  offlineIndicator: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncMessage: {
    color: '#ff9800',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  pendingSection: {
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  pendingSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 8,
  },
  pendingActivityItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  pendingActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingActivityTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  pendingSyncBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingSyncBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pendingActivityStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pendingStatText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
