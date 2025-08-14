import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {wp, hp} from '../components/responsive';
import {RootStackParamList} from '../../App';

type TermsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TermsAndConditions'
>;

interface TermsAndConditionsScreenProps {
  navigation: TermsScreenNavigationProp;
}

const TermsAndConditionsScreen: React.FC<TermsAndConditionsScreenProps> = ({
  navigation,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Notice on Processing of Personal Data</Text>

        <Text style={styles.content}>
          This platform is provided to you by Novo Nordisk India Private Limited
          (“Novo Nordisk”) and is intended to be used for accessing the NovoRun
          App. The objective of this app is to encourage wellness of the user by
          promoting physical activity, nutrition, and mental health. {'\n\n'}
          We are required by law to protect your personal data. This Notice
          explains how we process (e.g., collect, use, store, and share) your
          personal data. We will process any personal data about you in
          accordance with this Notice and applicable law.
        </Text>

        <Text style={styles.sectionTitle}>Who Are We?</Text>
        <Text style={styles.content}>
          The company responsible for processing your personal data is:{'\n\n'}
          <Text style={styles.boldText}>Toadlabs</Text>
          {'\n'}
          #23, Second Floor, Muninarayanappa Complex, New Airport Road,
          Kothanur, Bengaluru, Karnataka, 560077{'\n\n'}
          <Text style={styles.boldText}>
            Novo Nordisk India Private Limited
          </Text>
          {'\n'}
          NXT 2, 1 & 2nd Floor, Embassy Manyata Business Park, Nagavara Village,
          Kasaba Hobli, Venkateshapura, Bangalore North - 560045, Karnataka,
          India{'\n\n'}
          For questions, contact:{' '}
          <Text style={styles.linkText}>privacy-india@novonordisk.com</Text>
        </Text>

        <Text style={styles.sectionTitle}>
          How Do We Collect Personal Data About You?
        </Text>
        <Text style={styles.content}>
          Your data is collected directly from you and stored on servers in
          India, managed by third-party providers.
        </Text>

        <Text style={styles.sectionTitle}>
          Why Do We Process Your Personal Data?
        </Text>
        <Text style={styles.content}>
          We process personal data for:{'\n\n'}-{' '}
          <Text style={styles.boldText}>Name:</Text> Identification on
          third-party apps.{'\n'}- <Text style={styles.boldText}>Email:</Text>{' '}
          Sending event updates.{'\n'}-{' '}
          <Text style={styles.boldText}>Mobile:</Text> Authentication.{'\n'}-{' '}
          <Text style={styles.boldText}>Age:</Text> Calorie calculations.{'\n'}-{' '}
          <Text style={styles.boldText}>City:</Text> Contests for employees.
          {'\n'}- <Text style={styles.boldText}>Gender:</Text> Harris-Benedict
          equation for calorie calculation.{'\n'}-{' '}
          <Text style={styles.boldText}>Weight:</Text> Obesity category
          awareness.{'\n'}- <Text style={styles.boldText}>Height:</Text>{' '}
          Harris-Benedict equation for calorie calculation.{'\n'}
        </Text>

        <Text style={styles.sectionTitle}>
          How Do We Share Your Personal Data?
        </Text>
        <Text style={styles.content}>
          We may share your data with:{'\n\n'}- Vendors (consultants, IT service
          providers, law firms).{'\n'}- Other Novo Nordisk entities.{'\n'}-
          Public and regulatory authorities.{'\n'}
        </Text>

        <Text style={styles.sectionTitle}>
          How Long Will We Keep Your Personal Data?
        </Text>
        <Text style={styles.content}>
          Your data is stored for up to five years after the app is discontinued
          unless required by law.
        </Text>

        <Text style={styles.sectionTitle}>Your Rights</Text>
        <Text style={styles.content}>
          You have the right to:{'\n\n'}- Request access to your data.{'\n'}-
          Request corrections or updates.{'\n'}- Request deletion of your data.
          {'\n'}- Limit processing of your data.{'\n'}- Withdraw consent
          anytime.{'\n'}- File complaints with the Data Protection Authority.
          {'\n'}
        </Text>
      </ScrollView>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
  },
  title: {
    fontSize: wp(6),
    fontWeight: 'bold',
    color: '#001965',
    marginBottom: hp(2),
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: wp(5),
    fontWeight: 'bold',
    color: '#001965',
    marginTop: hp(3),
    marginBottom: hp(1),
  },
  content: {
    fontSize: wp(4),
    color: '#333',
    lineHeight: wp(6),
  },
  boldText: {
    fontWeight: 'bold',
    color: '#000',
  },
  linkText: {
    color: '#1E90FF',
    textDecorationLine: 'underline',
  },
  backButton: {
    backgroundColor: '#001965',
    padding: wp(3),
    margin: wp(5),
    borderRadius: wp(2),
  },
  backButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: wp(4),
  },
});

export default TermsAndConditionsScreen;
