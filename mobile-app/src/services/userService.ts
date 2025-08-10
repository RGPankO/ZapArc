import { Platform } from 'react-native';
import { ApiResponse, User } from '../types';

export interface UpdateProfileRequest {
  nickname?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfile extends User {
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class UserService {
  private getBaseUrl(): string {
    // For development, determine the correct base URL based on platform
    if (Platform.OS === 'web') {
      // Try localhost first, but if that fails, we'll use IP
      return 'http://localhost:3000/api';
    } else if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to access host machine's localhost
      return 'http://10.0.2.2:3000/api';
    } else {
      // For iOS simulator and physical devices, use the computer's IP
      return 'http://192.168.1.5:3000/api';
    }
  }

  private get baseUrl(): string {
    return this.getBaseUrl();
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const { tokenService } = await import('./tokenService');
      return await tokenService.getAccessToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  async getProfile(): Promise<ApiResponse<{ user: UserProfile }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/users/profile`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'PROFILE_FETCH_FAILED', message: 'Failed to fetch profile' },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error,
        },
      };
    }
  }

  async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<{ user: UserProfile }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/users/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'PROFILE_UPDATE_FAILED', message: 'Failed to update profile' },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error,
        },
      };
    }
  }

  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/users/password`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'PASSWORD_CHANGE_FAILED', message: 'Failed to change password' },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error,
        },
      };
    }
  }

  async deleteAccount(): Promise<ApiResponse<{ message: string }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/users/account`, {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'ACCOUNT_DELETE_FAILED', message: 'Failed to delete account' },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error,
        },
      };
    }
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    try {
      const headers = await this.getAuthHeaders();
      const { tokenService } = await import('./tokenService');
      const refreshToken = await tokenService.getRefreshToken();
      
      const response = await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'LOGOUT_FAILED', message: 'Failed to logout' },
        };
      }

      // Clear stored tokens
      await tokenService.clearAuth();
      
      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if the API call fails, clear local tokens
      try {
        const { tokenService } = await import('./tokenService');
        await tokenService.clearAuth();
      } catch (clearError) {
        console.error('Error clearing tokens:', clearError);
      }
      
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error,
        },
      };
    }
  }
}

export const userService = new UserService();