// Add this file to handle responsive dimensions
import {Dimensions, PixelRatio} from 'react-native';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export const wp = (percentage: number) => {
  return PixelRatio.roundToNearestPixel((screenWidth * percentage) / 100);
};

export const hp = (percentage: number) => {
  return PixelRatio.roundToNearestPixel((screenHeight * percentage) / 100);
};
