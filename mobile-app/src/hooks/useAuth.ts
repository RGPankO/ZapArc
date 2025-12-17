import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { tokenService } from '../services/tokenService';
import { User } from '../types';

// Auth state types
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
}

// Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nickname: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Hook to check authentication state
 */
export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const authenticated = await tokenService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    isAuthenticated,
    isLoading,
    checkAuth,
  };
}

/**
 * Hook to login with email/password
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const result = await apiClient.post<AuthResponse>('/auth/login', data);
      const authData = result as unknown as AuthResponse;

      await tokenService.storeTokens({
        accessToken: authData.tokens.accessToken,
        refreshToken: authData.tokens.refreshToken,
      });
      await tokenService.storeUser(authData.user);

      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

/**
 * Hook to register a new user
 */
export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) =>
      apiClient.post<{ message: string }>('/auth/register', data),
  });
}

/**
 * Hook to login with Google
 */
export function useGoogleLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idToken: string) => {
      const result = await apiClient.post<AuthResponse>('/auth/google', { idToken });
      const authData = result as unknown as AuthResponse;

      await tokenService.storeTokens({
        accessToken: authData.tokens.accessToken,
        refreshToken: authData.tokens.refreshToken,
      });
      await tokenService.storeUser(authData.user);

      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

/**
 * Hook to resend verification email
 */
export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ message: string }>('/auth/resend-verification', { email }),
  });
}

/**
 * Hook to verify email with token
 */
export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) =>
      apiClient.post<{ message: string }>('/auth/verify-email', { token }),
  });
}

/**
 * Hook to refresh access token
 */
export function useRefreshToken() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = await tokenService.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const result = await apiClient.post<{ accessToken: string }>('/auth/refresh-token', {
        refreshToken,
      });
      const data = result as unknown as { accessToken: string };

      await tokenService.storeTokens({
        accessToken: data.accessToken,
        refreshToken,
      });

      return data;
    },
  });
}
