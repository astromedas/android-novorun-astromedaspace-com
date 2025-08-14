import React, {useContext} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import UserContext from '../context/userContext';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';
import {useNavigation} from '@react-navigation/native';

type NavigationProps = NativeStackNavigationProp<
  RootStackParamList,
  'EventScreen'
>;

export default function UserCard() {
  const user = useContext(UserContext);
  const navigation = useNavigation<NavigationProps>();

  const handleNotification = () => {
    navigation.navigate('NotificationScreen');
  };

  return (
    <View style={styles.container}>
      <View style={styles.homeContainer}>
        <Image
          source={
            user?.picture ? {uri: user?.picture} : require('../assets/user.png')
          }
          style={styles.profileImage}
        />
        <TouchableOpacity
          style={styles.notification}
          onPress={handleNotification}>
          <Image
            source={require('../assets/noti.png')}
            style={styles.notificationImage}
          />
        </TouchableOpacity>
        <View style={styles.helloUser}>
          <Text style={styles.hello}>Hello, </Text>
          <Text style={styles.name}>
            {user?.name ? user.name + '!' : 'Dude!'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 25,
    backgroundColor: '#fff',
  },
  homeContainer: {
    backgroundColor: '#fff',
    marginBottom: 30,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 50,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 2,
    marginLeft: 15,
    borderColor: '#ccc',
  },
  notificationImage: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 50,
    marginBottom: 10,
    top: -2,
    right: -17,
    borderWidth: 2,
    marginRight: 15,
    borderColor: '#ccc',
  },
  notification: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 50,
    marginBottom: 10,
    top: 5,
    right: 5,
    borderWidth: 2,
    marginRight: 15,
    borderColor: '#ccc',
  },
  helloUser: {
    marginTop: 10,
    marginLeft: 15,
  },
  hello: {
    fontWeight: '500',
    color: '#001965',
    fontSize: 30,
    fontFamily: 'apis',
  },
  name: {
    fontWeight: '800',
    color: '#001965',
    fontSize: 30,
    fontFamily: 'apis',
  },
});
