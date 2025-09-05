import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import axios from 'axios';

class NotificationService {
  constructor() {
    this.createDefaultChannels();
    this.configurePushNotifications();
  }

  createDefaultChannels() {
    PushNotification.createChannel(
      {
        channelId: 'default-channel',
        channelName: 'Default Channel',
        channelDescription: 'Default notification channel',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      created => console.log(`Channel created: ${created}`),
    );
  }

  configurePushNotifications() {
    PushNotification.configure({
      onNotification: function (notification) {
        console.log('Notification received:', notification);
      },
      popInitialNotification: true,
      requestPermissions: true,
    });
  }

  showNotification(title: string, message: string) {
    PushNotification.localNotification({
      channelId: 'default-channel',
      title: title,
      message: message,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      vibrate: true,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_launcher',
    });
  }

  async requestUserPermission(): Promise<FirebaseMessagingTypes.AuthorizationStatus> {
    return await messaging().requestPermission();
  }

  async sendFCMTokenToServer(fcmToken: string): Promise<void> {
    try {
      const userId = await AsyncStorage.getItem('userId');

      await axios.post(
        'https://ecf63b299473.ngrok-free.app/api/user/notification/fcm',
        {
          fcmToken,
          userId,
        },
      );
      console.log('FCM token sent successfully');
    } catch (error) {
      console.log('Error saving FCM token to server:', error);
    }
  }

  async getFCMToken(): Promise<string | null> {
    let fcmToken = await AsyncStorage.getItem('fcmToken');

    if (!fcmToken) {
      try {
        fcmToken = await messaging().getToken();
        if (fcmToken) {
          await AsyncStorage.setItem('fcmToken', fcmToken);
          await this.sendFCMTokenToServer(fcmToken);
        }
      } catch (error) {
        console.log('Error getting FCM token:', error);
      }
    }
    return fcmToken;
  }

  async initialize(): Promise<string | null> {
    await this.requestUserPermission();
    const token = await this.getFCMToken();

    messaging().onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log(
          'FOREGROUND Message Data:',
          JSON.stringify(remoteMessage.data),
        );
        console.log('Received foreground message:', remoteMessage);
        this.showNotification(
          remoteMessage.notification?.title || 'New Message',
          remoteMessage.notification?.body || '',
        );
      },
    );

    messaging().setBackgroundMessageHandler(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log(
          'BACKGROUND Message Data:',
          JSON.stringify(remoteMessage.data),
        );
        console.log('Received background message:', remoteMessage);
        this.showNotification(
          remoteMessage.notification?.title || 'New Message',
          remoteMessage.notification?.body || '',
        );
      },
    );

    return token;
  }
}

export default new NotificationService();
