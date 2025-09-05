import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import UserContext from '../context/userContext';
import {useNavigation} from '@react-navigation/native'; // Import navigation hook
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

const NotificationScreen: React.FC = () => {
  const user = useContext(UserContext);
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const [notifications, setNotifications] = useState<
    {
      eventId: string;
      event: {name: string; startTime: string};
      message: string;
    }[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(
          'https://ecf63b299473.ngrok-free.app/api/user/notification/check',
          {
            headers: {
              Authorization: `Bearer ${user?.accessToken}`,
            },
          },
        );
        setNotifications(response.data);
        // console.log(response.data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user?.accessToken]);

  const handleNotificationPress = () => {
    // Direct navigation to event screen
    navigation.navigate('EventScreen');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      {notifications.length === 0 ? (
        <Text style={styles.text}>No notifications available now</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.message}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.notificationItem}
              onPress={() => handleNotificationPress()}>
              <Text style={styles.notificationText}>{item.message}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: 'black',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
    color: 'black',
  },
  notificationItem: {
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
  },
  notificationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  notificationDate: {
    fontSize: 14,
    color: '#666',
  },
});

export default NotificationScreen;
