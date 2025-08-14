import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDER_WIDTH = SCREEN_WIDTH * 0.7;
const BUTTON_WIDTH = 60;

interface SlideToStartProps {
  onSlideComplete: () => void;
  text: string;
  backgroundColor?: string;
}

const SlideToStart: React.FC<SlideToStartProps> = ({
  onSlideComplete,
  text,
  backgroundColor = '#001965',
}) => {
  const [slidePosition] = useState(new Animated.Value(0));
  const [isComplete, setIsComplete] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const newPosition = Math.max(
        0,
        Math.min(gestureState.dx, SLIDER_WIDTH - BUTTON_WIDTH),
      );
      slidePosition.setValue(newPosition);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx >= SLIDER_WIDTH - BUTTON_WIDTH - 20) {
        Animated.timing(slidePosition, {
          toValue: SLIDER_WIDTH - BUTTON_WIDTH,
          duration: 100,
          useNativeDriver: false,
        }).start(() => {
          setIsComplete(true);
          onSlideComplete();
        });
      } else {
        Animated.spring(slidePosition, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  if (isComplete) {
    return null;
  }

  return (
    <View style={[styles.container, {backgroundColor}]}>
      <Text style={styles.sliderText}>{text}</Text>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.button,
          {
            transform: [{translateX: slidePosition}],
          },
        ]}>
        <Text style={styles.buttonText}>→</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SLIDER_WIDTH,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  button: {
    width: BUTTON_WIDTH,
    height: BUTTON_WIDTH,
    borderRadius: BUTTON_WIDTH / 2,
    backgroundColor: 'white',
    position: 'absolute',
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 24,
    color: '#001965',
  },
  sliderText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default SlideToStart;
