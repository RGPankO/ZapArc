import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, Card, List, Switch, Dialog, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { router } from 'expo-router';
import { userService, ChangePasswordRequest } from '../../src/services/userService';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const passwordSchema = yup.object({
  currentPassword: yup
    .string()
    .required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: yup
    .string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

export default function SettingsScreen(): React.JSX.Element {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // App preferences (these would be stored in AsyncStorage in a real app)
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: yupResolver(passwordSchema),
    mode: 'onBlur',
  });

  const onPasswordSubmit = async (data: PasswordFormData): Promise<void> => {
    setIsChangingPassword(true);
    setError(null);

    try {
      const changePasswordData: ChangePasswordRequest = {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      };

      const result = await userService.changePassword(changePasswordData);
      
      if (result.success) {
        Alert.alert(
          'Password Changed',
          'Your password has been changed successfully. You will need to log in again.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowPasswordForm(false);
                reset();
                handleLogout();
              },
            },
          ]
        );
      } else {
        setError(result.error?.message || 'Failed to change password');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);

    try {
      const result = await userService.logout();
      
      if (result.success) {
        // Navigate back to auth flow
        router.replace('/auth/welcome');
      } else {
        Alert.alert('Logout Failed', result.error?.message || 'Failed to logout');
      }
    } catch (err) {
      Alert.alert('Logout Failed', 'An unexpected error occurred');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    setIsDeletingAccount(true);

    try {
      const result = await userService.deleteAccount();
      
      if (result.success) {
        Alert.alert(
          'Account Deleted',
          'Your account has been permanently deleted.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/auth/welcome'),
            },
          ]
        );
      } else {
        Alert.alert('Delete Failed', result.error?.message || 'Failed to delete account');
      }
    } catch (err) {
      Alert.alert('Delete Failed', 'An unexpected error occurred');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
    }
  };

  const confirmDeleteAccount = (): void => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setShowDeleteDialog(true),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Settings
          </Text>

          {/* App Preferences */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                App Preferences
              </Text>
              
              <List.Item
                title="Push Notifications"
                description="Receive notifications about app updates"
                right={() => (
                  <Switch
                    value={notifications}
                    onValueChange={setNotifications}
                  />
                )}
              />
              
              <List.Item
                title="Dark Mode"
                description="Use dark theme throughout the app"
                right={() => (
                  <Switch
                    value={darkMode}
                    onValueChange={setDarkMode}
                  />
                )}
              />
              
              <List.Item
                title="Auto Sync"
                description="Automatically sync data when connected"
                right={() => (
                  <Switch
                    value={autoSync}
                    onValueChange={setAutoSync}
                  />
                )}
              />
            </Card.Content>
          </Card>

          {/* Account Security */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Account Security
              </Text>
              
              <List.Item
                title="Change Password"
                description="Update your account password"
                left={(props) => <List.Icon {...props} icon="lock" />}
                onPress={() => setShowPasswordForm(true)}
              />
            </Card.Content>
          </Card>

          {/* Account Actions */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Account Actions
              </Text>
              
              <List.Item
                title="Logout"
                description="Sign out of your account"
                left={(props) => <List.Icon {...props} icon="logout" />}
                onPress={handleLogout}
                disabled={isLoggingOut}
              />
              
              <List.Item
                title="Delete Account"
                description="Permanently delete your account"
                left={(props) => <List.Icon {...props} icon="delete" />}
                titleStyle={styles.dangerText}
                onPress={confirmDeleteAccount}
                disabled={isDeletingAccount}
              />
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      {/* Change Password Dialog */}
      <Portal>
        <Dialog visible={showPasswordForm} onDismiss={() => setShowPasswordForm(false)}>
          <Dialog.Title>Change Password</Dialog.Title>
          <Dialog.Content>
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Controller
              control={control}
              name="currentPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Current Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.currentPassword}
                    style={styles.input}
                    mode="outlined"
                    secureTextEntry={!showCurrentPassword}
                    right={
                      <TextInput.Icon
                        icon={showCurrentPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      />
                    }
                  />
                  {errors.currentPassword && (
                    <Text style={styles.fieldError}>{errors.currentPassword.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="New Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.newPassword}
                    style={styles.input}
                    mode="outlined"
                    secureTextEntry={!showNewPassword}
                    right={
                      <TextInput.Icon
                        icon={showNewPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                      />
                    }
                  />
                  {errors.newPassword && (
                    <Text style={styles.fieldError}>{errors.newPassword.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Confirm New Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.confirmPassword}
                    style={styles.input}
                    mode="outlined"
                    secureTextEntry={!showConfirmPassword}
                    right={
                      <TextInput.Icon
                        icon={showConfirmPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    }
                  />
                  {errors.confirmPassword && (
                    <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>
                  )}
                </View>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPasswordForm(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onPasswordSubmit)}
              loading={isChangingPassword}
              disabled={isChangingPassword}
            >
              Change Password
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Account Confirmation Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Confirm Account Deletion</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This will permanently delete your account and all associated data. 
              This action cannot be undone.
            </Text>
            <Text variant="bodyMedium" style={styles.warningText}>
              Are you absolutely sure you want to continue?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor="#f44336"
              onPress={handleDeleteAccount}
              loading={isDeletingAccount}
              disabled={isDeletingAccount}
            >
              Delete Account
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  dangerText: {
    color: '#f44336',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'white',
  },
  fieldError: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  warningText: {
    marginTop: 16,
    fontWeight: 'bold',
    color: '#f44336',
  },
});