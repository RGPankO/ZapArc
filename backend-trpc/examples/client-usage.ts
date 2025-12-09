/**
 * Example: Using the tRPC Backend Client
 *
 * This file demonstrates how to create and use a type-safe tRPC client
 * to interact with the backend-trpc API.
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../src/server/routers/_app';

/**
 * Create a tRPC client with type safety.
 *
 * The client automatically infers all available procedures and their types
 * from the AppRouter type, providing full IDE autocomplete and type checking.
 */
const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',

      // Add authentication header to all requests
      headers() {
        // In a real app, get this from your auth state/storage
        const token = 'your-jwt-token-here';

        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    }),
  ],
});

/**
 * Example Usage Functions
 */

async function getUserProfile() {
  try {
    const profile = await client.user.getProfile.query();

    console.log('User Profile:', profile);
    // Type is inferred automatically:
    // profile.id, profile.email, profile.nickname, etc.

    return profile;
  } catch (error) {
    console.error('Failed to get profile:', error);
    throw error;
  }
}

async function updateUserProfile() {
  try {
    const updated = await client.user.updateProfile.mutate({
      nickname: 'John Doe',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });

    console.log('Updated Profile:', updated);
    return updated;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
}

async function changePassword() {
  try {
    const result = await client.user.changePassword.mutate({
      currentPassword: 'oldPassword123',
      newPassword: 'newSecurePassword123!',
    });

    console.log('Password Changed:', result.message);
    return result;
  } catch (error) {
    console.error('Failed to change password:', error);
    throw error;
  }
}

async function deleteAccount() {
  try {
    const result = await client.user.deleteAccount.mutate({
      password: 'myCurrentPassword',
      confirmation: 'DELETE', // Must be exactly "DELETE"
    });

    console.log('Account Deleted:', result.message);
    return result;
  } catch (error) {
    console.error('Failed to delete account:', error);
    throw error;
  }
}

/**
 * Example: React Hook Usage
 *
 * In a React app, you would typically use @trpc/react-query:
 */

/*
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../src/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

// In your component:
function UserProfile() {
  const { data, isLoading, error } = trpc.user.getProfile.useQuery();
  const updateProfile = trpc.user.updateProfile.useMutation();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data.nickname}</h1>
      <p>{data.email}</p>
      <button onClick={() => updateProfile.mutate({ nickname: 'New Name' })}>
        Update Name
      </button>
    </div>
  );
}
*/

/**
 * Example: React Native Usage with TanStack Query
 */

/*
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../src/server/routers/_app';

const trpc = createTRPCReact<AppRouter>();

// Create query client
const queryClient = new QueryClient();

// Create tRPC client
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
      headers() {
        // Get token from AsyncStorage or auth context
        const token = getAuthToken();
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    }),
  ],
});

// Wrap your app
export function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <YourApp />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// In your components:
function UserProfileScreen() {
  const { data, isLoading } = trpc.user.getProfile.useQuery();
  const updateProfile = trpc.user.updateProfile.useMutation();

  return (
    <View>
      <Text>{data?.nickname}</Text>
      <Button
        title="Update"
        onPress={() => updateProfile.mutate({ nickname: 'New Name' })}
      />
    </View>
  );
}
*/

/**
 * Example: Error Handling
 */

async function exampleWithErrorHandling() {
  try {
    const profile = await client.user.getProfile.query();
    return profile;
  } catch (error: any) {
    // tRPC errors have a specific shape
    if (error.data?.code === 'UNAUTHORIZED') {
      console.log('User is not authenticated');
      // Redirect to login
    } else if (error.data?.code === 'NOT_FOUND') {
      console.log('Resource not found');
    } else {
      console.log('Unexpected error:', error.message);
    }
  }
}

/**
 * Run Examples
 */
async function main() {
  console.log('tRPC Client Examples\n');

  // Uncomment to test (make sure you have a valid token):

  // await getUserProfile();
  // await updateUserProfile();
  // await changePassword();
  // await deleteAccount();
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  client,
  getUserProfile,
  updateUserProfile,
  changePassword,
  deleteAccount,
};
