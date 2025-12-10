import { trpc } from '../lib/trpc';

/**
 * Hook for user-related operations using tRPC
 * Provides type-safe access to user queries and mutations
 */
export function useUsers() {
  // Query: Get current user's profile
  const profileQuery = trpc.user.getProfile.useQuery(undefined, {
    // Only fetch when user is likely authenticated
    enabled: true,
    // Refetch on mount if data is stale
    refetchOnMount: true,
  });


  // Mutation: Update user profile
  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      // Invalidate and refetch profile after update
      profileQuery.refetch();
    },
  });

  // Mutation: Change password
  const changePasswordMutation = trpc.user.changePassword.useMutation();

  // Mutation: Delete account
  const deleteAccountMutation = trpc.user.deleteAccount.useMutation();

  return {
    // Profile data
    user: profileQuery.data,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
    refetch: profileQuery.refetch,

    // Update profile
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    updateError: updateProfileMutation.error,

    // Change password
    changePassword: changePasswordMutation.mutate,
    changePasswordAsync: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
    changePasswordError: changePasswordMutation.error,

    // Delete account
    deleteAccount: deleteAccountMutation.mutate,
    deleteAccountAsync: deleteAccountMutation.mutateAsync,
    isDeleting: deleteAccountMutation.isPending,
    deleteError: deleteAccountMutation.error,
  };
}

/**
 * Hook for just fetching the user profile
 * Lighter version if you only need read access
 */
export function useUserProfile() {
  const { data, isLoading, isError, error, refetch } = trpc.user.getProfile.useQuery();

  return {
    user: data,
    isLoading,
    isError,
    error,
    refetch,
  };
}

/**
 * Hook for updating user profile
 * Use when you only need mutation capabilities
 */
export function useUpdateProfile() {
  const utils = trpc.useUtils();

  return trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      // Invalidate the profile query to refetch fresh data
      utils.user.getProfile.invalidate();
    },
  });
}

/**
 * Hook for changing password
 */
export function useChangePassword() {
  return trpc.user.changePassword.useMutation();
}

/**
 * Hook for deleting account
 */
export function useDeleteAccount() {
  return trpc.user.deleteAccount.useMutation();
}
