import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

// Create a navigation reference that can be used outside of React components
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Navigation helper function to navigate to login and clear the stack
export function navigateToLogin() {
  if (navigationRef.isReady()) {
    // Reset navigation stack and go to login
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }
}

// Navigation helper function to navigate to any screen
export function navigate(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  }
}
