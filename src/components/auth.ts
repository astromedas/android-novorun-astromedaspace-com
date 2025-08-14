import auth from '@react-native-firebase/auth';
import appCheck from '@react-native-firebase/app-check';

export const sendOTP = async (phoneNumber: string): Promise<string> => {
  appCheck().activate('play-integrity');
  try {
    const formattedPhone = phoneNumber.startsWith('+91')
      ? phoneNumber
      : `+91${phoneNumber}`;

    // CHANGE THIS LINE - Remove the 'true' parameter
    const confirmation = await auth().signInWithPhoneNumber(formattedPhone);

    return confirmation.verificationId || '';
  } catch (error) {
    console.error('Send OTP Error:', error);
    throw error;
  }
};

export const verifyOTP = async (
  verificationId: string,
  code: string,
): Promise<boolean> => {
  try {
    const credential = auth.PhoneAuthProvider.credential(verificationId, code);
    await auth().signInWithCredential(credential);
    return true;
  } catch (error) {
    console.error('Verify OTP Error:', error);
    throw new Error('Invalid OTP code');
  }
};
