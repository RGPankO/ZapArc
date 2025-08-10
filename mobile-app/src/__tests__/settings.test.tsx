import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import SettingsScreen from '../../app/(main)/settings';

// Mock the userService
jest.mock('../services/userService', () => ({
  userService: {
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
    logout: jest.fn(),
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <PaperProvider>
      {component}
    </PaperProvider>
  );
};

describe('SettingsScreen', () => {
  it('renders without crashing', () => {
    const { getByText } = renderWithProvider(<SettingsScreen />);
    expect(getByText('Settings')).toBeTruthy();
  });

  it('shows app preferences section', () => {
    const { getByText } = renderWithProvider(<SettingsScreen />);
    expect(getByText('App Preferences')).toBeTruthy();
    expect(getByText('Push Notifications')).toBeTruthy();
    expect(getByText('Dark Mode')).toBeTruthy();
    expect(getByText('Auto Sync')).toBeTruthy();
  });

  it('shows account security section', () => {
    const { getByText } = renderWithProvider(<SettingsScreen />);
    expect(getByText('Account Security')).toBeTruthy();
    expect(getByText('Change Password')).toBeTruthy();
  });

  it('shows account actions section', () => {
    const { getByText } = renderWithProvider(<SettingsScreen />);
    expect(getByText('Account Actions')).toBeTruthy();
    expect(getByText('Logout')).toBeTruthy();
    expect(getByText('Delete Account')).toBeTruthy();
  });
});