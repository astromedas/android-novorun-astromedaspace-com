/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';
import appCheck from '@react-native-firebase/app-check';

// Add this to your App.tsx or index.js
appCheck().activate('play-integrity', true);

// Register background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
});

// Register headless task
AppRegistry.registerHeadlessTask(
  'ReactNativeFirebaseMessagingHeadlessTask',
  () => async remoteMessage => {
    console.log('Headless Message:', remoteMessage);
  },
);

// Register main component
AppRegistry.registerComponent(appName, () => App);
