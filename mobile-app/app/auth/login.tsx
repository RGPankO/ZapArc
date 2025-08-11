import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authService } from '../../src/services/authService';

interface LoginFormData {
  email: string;
  password: string;
}

const schema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required'),
});

export default function LoginScreen(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setIsLoading(true);
    setLoginError(null);
    
    try {
      console.log('Login: Starting login with data:', data);
      
      // Test network connectivity first
      const { testNetworkConnectivity } = await import('../../src/utils/networkTest');
      console.log('Login: Testing network connectivity...');
      const connectivityResult = await testNetworkConnectivity();
      console.log('Login: Connectivity test results:', connectivityResult);
      
      if (!connectivityResult.workingUrl) {
        setLoginError('Cannot connect to server. Please check your network connection.');
        setIsLoading(false);
        return;
      }
      
      console.log('Login: Using working URL:', connectivityResult.workingUrl);
      
      const result = await authService.login({
        email: data.email,
        password: data.password,
      });
      
      console.log('Login: Login result:', result);
      
      if (result.success && result.data) {
        // Store authentication tokens and user data
        try {
          const { tokenService } = await import('../../src/services/tokenService');
          
          await tokenService.storeTokens({
            accessToken: result.data.tokens.accessToken,
            refreshToken: result.data.tokens.refreshToken,
          });
          
          await tokenService.storeUser({
            id: result.data.user.id,
            email: result.data.user.email,
            nickname: result.data.user.nickname,
            isVerified: result.data.user.isVerified,
            premiumStatus: result.data.user.premiumStatus,
          });
          
          console.log('✅ Tokens and user data stored successfully');
          
          Alert.alert('Login Successful', 'Welcome back!', [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to main app area
                router.replace('/(main)/profile');
              },
            },
          ]);
        } catch (tokenError) {
          console.error('Error storing tokens:', tokenError);
          Alert.alert('Login Successful', 'Welcome back! (Note: Session may not persist)', [
            {
              text: 'OK',
              onPress: () => router.replace('/(main)/profile'),
            },
          ]);
        }
      } else {
        // Handle different error types
        if (result.error?.code === 'EMAIL_NOT_VERIFIED') {
          Alert.alert(
            'Email Not Verified',
            'Please verify your email address before logging in.',
            [
              {
                text: 'Verify Now',
                onPress: () => router.push('/auth/email-verification'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          setLoginError(result.error?.message || 'Invalid email or password. Please try again.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Login failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPress = (): void => {
    router.push('/auth/register');
  };

  const handleForgotPassword = (): void => {
    Alert.alert(
      'Forgot Password',
      'Password reset functionality will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Welcome Back
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Sign in to your account
          </Text>

          {loginError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.email}
                    style={styles.input}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <HelperText type="error" visible={!!errors.email}>
                    {errors.email?.message}
                  </HelperText>
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.password}
                    style={styles.input}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                  />
                  <HelperText type="error" visible={!!errors.password}>
                    {errors.password?.message}
                  </HelperText>
                </View>
              )}
            />

            <Button
              mode="text"
              onPress={handleForgotPassword}
              style={styles.forgotButton}
              compact
            >
              Forgot Password?
            </Button>

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={styles.submitButton}
              contentStyle={styles.buttonContent}
            >
              Login
            </Button>

            <View style={styles.registerContainer}>
              <Text variant="bodyMedium">Don't have an account? </Text>
              <Button
                mode="text"
                onPress={handleRegisterPress}
                compact
                style={styles.registerButton}
              >
                Register
              </Button>
            </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  errorContainer: {
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
  form: {
    marginTop: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  registerButton: {
    marginLeft: -8,
  },
});