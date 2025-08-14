import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Image,
} from 'react-native';
import {setOnboardingCompleted} from '../components/sqliteUtils';
import {wp, hp} from '../components/responsive';
import CheckBox from '@react-native-community/checkbox';

interface OnboardingScreenProps {
  navigation: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({navigation}) => {
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const handleOnboardingComplete = async () => {
    try {
      await setOnboardingCompleted();
      navigation.replace('Login');
    } catch (error) {
      // console.log('Error storing onboarding status:', error);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/background.jpeg')}
      style={styles.background}>
      {step === 1 && (
        <View style={styles.centeredView}>
          <Image
            source={require('../assets/novoRUN_circular.png')}
            style={styles.logoimgae}
          />
          <Text style={styles.onboardingText}>LET'S RUN TOGETHER</Text>

          <View style={styles.termsContainer}>
            <CheckBox
              value={termsAccepted}
              onValueChange={setTermsAccepted}
              tintColors={{true: '#001965', false: '#ffffff'}}
            />
            <TouchableOpacity
              onPress={() => navigation.navigate('TermsAndConditions')}>
              <Text style={styles.termsText}>
                I accept the terms and privacy policy
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, !termsAccepted && styles.buttonDisabled]}
            onPress={() => setStep(2)}
            disabled={!termsAccepted}>
            <Text
              style={[
                styles.buttonText,
                !termsAccepted && styles.buttonTextDisabled,
              ]}>
              Go
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {step === 2 && (
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Image
              source={require('../assets/novoRUN_circular.png')}
              style={styles.logoim}
            />
            <Text style={styles.title}>GET STARTED</Text>
            <Text style={styles.subtitle}>Register to save your run.</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={handleOnboardingComplete}>
              <Text style={styles.buttonText}>Continue with email</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logoimgae: {
    position: 'absolute',
    left: wp(1.5),
    top: -hp(8),
    width: wp(22),
    height: wp(22),
    borderRadius: wp(11),
  },

  logoim: {
    width: wp(17),
    height: wp(17),
    marginBottom: hp(0.6),
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    borderRadius: wp(8.5),
  },

  centeredView: {
    alignItems: 'center',
    marginTop: 'auto',
  },

  onboardingText: {
    fontSize: wp(16),
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: hp(3.7),
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: wp(0.5), height: hp(0.25)},
    textShadowRadius: wp(2.5),
  },

  button: {
    backgroundColor: '#001965',
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(25.5),
    borderRadius: wp(6),
    marginBottom: hp(1.2),
  },

  buttonText: {
    fontSize: wp(4),
    color: 'white',
    fontWeight: '500',
    textAlign: 'center',
  },

  footerText: {
    color: 'white',
    fontSize: wp(2.9),
    marginBottom: hp(2.5),
    paddingHorizontal: wp(4.9),
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(35, 35, 35, 0.03)',
    justifyContent: 'flex-end',
  },

  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: wp(4.9),
    borderTopRightRadius: wp(4.9),
    padding: wp(8.5),
  },

  title: {
    fontSize: wp(7.3),
    fontWeight: 'bold',
    color: '#00296B',
    marginBottom: hp(0.6),
  },

  subtitle: {
    fontSize: wp(4.4),
    color: '#00296B',
    marginBottom: hp(2.5),
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2),
  },

  termsText: {
    color: 'white',
    fontSize: wp(3.5),
    marginLeft: wp(2),
    textDecorationLine: 'underline',
  },

  buttonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },

  buttonTextDisabled: {
    color: '#666666',
  },
});

export default OnboardingScreen;
