import React, {useContext, useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  // Alert,
} from 'react-native';
import httpClient from '../utils/httpClient';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import UserContext from '../context/userContext';

interface Event {
  eventId: string;
  id: string;
  name: string;
  startTime: string;
  description: string;
}

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

const UpcomingEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const user = useContext(UserContext);
  const eventIn = user?.insideOutside;

  console.log('event held in', eventIn);

  const fetchUpcomingEvent = useCallback(async () => {
    console.log('Fetching upcoming events...');
    try {
      const response = await httpClient.get(
        '/user/event/upcomingevents?message=upcomingevents',
      );
      console.log('Upcoming events:', response.data);
      const upcomingEvents = response.data.upcomingEvents.map((event: any) => ({
        eventId: event.eventId,
        id: event.id,
        name: event.name,
        startTime: event.startTime,
        description: event.description,
      }));
      setEvents(upcomingEvents);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUpcomingEvent();
    }, [fetchUpcomingEvent]),
  );

  const renderEvent = ({item}: {item: Event}) => {
    const eventDate = new Date(item.startTime);
    const today = new Date();
    const isUpcoming = eventDate > today;

    const day = eventDate.toLocaleDateString('en-US', {weekday: 'long'});
    const date = eventDate.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
    });

    const isManyataEvent = item.name.toLowerCase().includes('manayata');

    const handleCardPress = async () => {
      const routeType = isManyataEvent ? 'DEFAULT' : 'OWN';
      try {
        const response = await httpClient.post('/user/enroll/create', {
          userId: user?.userId,
          eventId: item.eventId,
          routeType: routeType,
          category: user?.gender,
        });
        if (response.status === 201) {
          // Alert.alert(
          //   'Enroll Successful',
          //   'You have been enrolled in the event.',
          // );
          if (isManyataEvent) {
            user?.setInsideOutside?.('DEFAULT');
          } else {
            user?.setInsideOutside?.('OWN');
          }
          navigation.navigate('EventScreen');
        }
      } catch (error: any) {
        if (error.response && error.response.status === 400) {
          // Alert.alert(
          //   'Already Enrolled',
          //   'You are already enrolled in this event.',
          // );
          if (isManyataEvent) {
            user?.setInsideOutside?.('DEFAULT');
          } else {
            user?.setInsideOutside?.('OWN');
          }
          navigation.navigate('EventScreen');
        } else {
          console.error('Error enrolling in the event:', error);
          // Alert.alert('Error', 'Failed to enroll in the event.');
        }
      }
    };

    return (
      <TouchableOpacity
        key={item.eventId}
        onPress={handleCardPress}
        style={styles.eventCardWrapper}>
        <ImageBackground
          source={require('../assets/legrun.jpeg')}
          style={styles.eventCardBackground}
          imageStyle={styles.eventCardImage}>
          {isManyataEvent && (
            <Image
              source={require('../assets/Novohealthlogo.png')}
              style={styles.logoImage}
            />
          )}

          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{date}</Text>
            <Text style={styles.dayText}>{day}</Text>
          </View>

          <Text style={styles.eventNameText}>{item.name}</Text>

          <View style={styles.upcomingStatusContainer}>
            <Text style={styles.upcomingStatusText}>
              {isUpcoming ? 'Upcoming' : 'Completed'}
            </Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : events.length > 0 ? (
        <FlatList
          data={events}
          keyExtractor={item => item.eventId}
          renderItem={renderEvent}
          numColumns={2}
          columnWrapperStyle={styles.row}
        />
      ) : (
        <Text style={styles.noEventsText}>No upcoming events found.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginTop: 25,
    backgroundColor: 'white',
  },
  noEventsText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  eventCardWrapper: {
    width: '48%',
    height: 220,
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: {width: 0, height: 3},
    shadowRadius: 4,
  },
  row: {
    justifyContent: 'space-between',
  },
  eventCardBackground: {
    flex: 1,
    justifyContent: 'space-between',
  },
  eventCardImage: {
    borderRadius: 10,
  },
  logoImage: {
    position: 'absolute',
    top: -38,
    left: -36,
    width: 140,
    height: 140,
    resizeMode: 'contain',
  },
  dateContainer: {
    marginTop: 70,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  dayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 3,
  },
  upcomingStatusContainer: {
    height: 30,
    backgroundColor: '#E6553F',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  upcomingStatusText: {
    fontSize: 15,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#fff',
    textAlign: 'center',
  },
  eventNameText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
  },
});

export default UpcomingEventsPage;
