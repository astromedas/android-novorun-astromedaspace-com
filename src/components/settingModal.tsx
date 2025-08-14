import React, {useContext, useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import UserContext from '../context/userContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onDeleteAccount: () => Promise<void>;
  onTermsPress: any;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  onDeleteAccount,
  onTermsPress,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const user = useContext(UserContext);

  useEffect(() => {
    if (!visible) {
      setShowDeleteConfirm(false);
      setEmailConfirmation('');
    }
  }, [visible]);

  const handleClose = () => {
    setShowDeleteConfirm(false);
    setEmailConfirmation('');
    onClose();
  };

  const handleDeleteRequest = () => {
    if (!user?.email) {
      Alert.alert(
        'Error',
        'Please logout and login again to delete your account.',
        [{text: 'OK', onPress: handleClose}],
      );
      return;
    }

    if (emailConfirmation.toLowerCase() === user.email) {
      Alert.alert(
        'Account Deactivation',
        'Your account will be deactivated for 15 days. If you login during this period, your account will be recovered. After 15 days, your account will be permanently deleted.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Proceed',
            style: 'destructive',
            onPress: async () => {
              if (user?.userId) {
                await onDeleteAccount();
                handleClose();
              }
            },
          },
        ],
      );
    } else {
      Alert.alert('Error', 'Email does not match. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Settings</Text>

          {!showDeleteConfirm && (
            <>
              <TouchableOpacity
                style={styles.settingButton}
                onPress={onTermsPress}>
                <Text style={styles.settingButtonText}>Terms & Conditions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert(
                    'Delete Account',
                    'Are you sure you want to delete your account?',
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                      {
                        text: 'Yes',
                        style: 'destructive',
                        onPress: () => setShowDeleteConfirm(true),
                      },
                    ],
                  );
                }}>
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              </TouchableOpacity>
            </>
          )}

          {showDeleteConfirm && (
            <View style={styles.confirmationContainer}>
              <Text style={styles.confirmationText}>
                Please enter your email to confirm account deletion:
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={emailConfirmation}
                onChangeText={setEmailConfirmation}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleDeleteRequest}>
                <Text style={styles.confirmButtonText}>Confirm Deletion</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 10,
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 38,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#001965',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  deleteButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmationContainer: {
    marginTop: 10,
  },
  confirmationText: {
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 10,
  },
  confirmButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  settingButtonText: {
    color: '#001965',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsModal;
