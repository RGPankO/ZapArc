import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import ProfileScreen from '../../app/(main)/profile';

// Mock the userService
jest.mock('../services/userService', () => ({
  userService: {
    getProfile: jest.fn().mockResolvedValue({
      success: true,
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          nickname: 'Test User',
          isVerified: true,
          premiumStatus: 'FREE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    }),
    updateProfile: jest.fn(),
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

describe('ProfileScreen', () => {
  it('renders without crashing', () => {
    const { getByText } = renderWithProvider(<ProfileScreen />);
    expect(getByText('Profile')).toBeTruthy();
  });

  it('shows loading state initially', () => {
    const { getByText } = renderWithProvider(<ProfileScreen />);
    expect(getByText('Loading profile...')).toBeTruthy();
  });
});