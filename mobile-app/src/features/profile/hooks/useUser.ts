import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';
import { tokenService } from '../../../services/tokenService';
import { User } from '../types';

export interface UserProfile extends User {
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileRequest {
  nickname?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

const USER_QUERY_KEY = ['user', 'profile'];

/**
 * Hook to get the current user's profile
 */
export function useUserProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: async () => {
      const result = await apiClient.get<{ user: UserProfile }>('/users/profile');
      return (result as unknown as { user: UserProfile }).user;
    },
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to update the user's profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      const result = await apiClient.put<{ user: UserProfile }>('/users/profile', data);
      return (result as unknown as { user: UserProfile }).user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(USER_QUERY_KEY, user);
    },
  });
}

/**
 * Hook to change the user's password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => apiClient.put('/users/password', data),
  });
}

/**
 * Hook to delete the user's account
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.delete('/users/account'),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

/**
 * Hook to logout the user
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = await tokenService.getRefreshToken();
      await apiClient.post('/auth/logout', { refreshToken });
      await tokenService.clearAuth();
    },
    onSuccess: () => {
      queryClient.clear();
    },
    onError: async () => {
      // Clear tokens even if logout API fails
      await tokenService.clearAuth();
      queryClient.clear();
    },
  });
}

/**
 * Hook to invalidate and refetch user profile
 */
export function useRefreshUserProfile() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
}
