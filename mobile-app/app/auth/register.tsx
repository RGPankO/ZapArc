import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authService } from '../../src/services/authService';

interface RegisterFormData {
  nickname: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const schema = yup.object({
  nickname: yup
    .string()
    .required('Nickname is required')
    .min(2, 'Nickname must be at least 2 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/\d/, 'Password must contain at least one number'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

export default function RegisterScreen(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    setIsLoading(true);

    try {
      console.log('Starting registration with data:', data);

      const result = await authService.register({
        nickname: data.nickname,
        email: data.email,
        password: data.password,
      });

      console.log('Registration result:', result);

      if (result.success) {
        Alert.alert(
          'Registration Successful',
          result.data?.message || 'Please check your email to verify your account.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/auth/email-verification'),
            },
          ]
        );
      } else {
        console.error('Registration failed:', result.error);
        Alert.alert(
          'Registration Failed',
          result.error?.message || 'Please try again later.'
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', 'Network error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginPress = (): void => {
    router.push('/auth/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
              Create Account
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Join us and start your journey
            </Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="nickname"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Nickname"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={!!errors.nickname}
                      style={styles.input}
                      mode="outlined"
                    />
                    <HelperText type="error" visible={!!errors.nickname}>
                      {errors.nickname?.message}
                    </HelperText>
                  </View>
                )}
              />

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

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Confirm Password"
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
                    <HelperText type="error" visible={!!errors.confirmPassword}>
                      {errors.confirmPassword?.message}
                    </HelperText>
                  </View>
                )}
              />

              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
                contentStyle={styles.buttonContent}
              >
                Create Account
              </Button>

              <View style={styles.loginContainer}>
                <Text variant="bodyMedium">Already have an account? </Text>
                <Button
                  mode="text"
                  onPress={handleLoginPress}
                  compact
                  style={styles.loginButton}
                >
                  Login
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
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
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
  form: {
    marginTop: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  loginButton: {
    marginLeft: -8,
  },
});