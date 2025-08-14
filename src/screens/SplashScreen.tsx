import React from 'react';
import {View, Image, StyleSheet} from 'react-native';

const SplashImageScreen = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/novorun_splash_screen.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001965',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default SplashImageScreen;
