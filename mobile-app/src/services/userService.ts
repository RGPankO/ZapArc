import { ApiResponse, User } from '../types';
import { NetworkConfig } from '../config/network';

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
    return NetworkConfig.getApiBaseUrl();
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
      console.log('UserService: Getting profile...');
      console.log('UserService: Base URL:', this.baseUrl);
      
      const headers = await this.getAuthHeaders();
      console.log('UserService: Headers prepared, has auth token:', !!headers.Authorization);
      console.log('UserService: Auth token preview:', headers.Authorization ? headers.Authorization.substring(0, 20) + '...' : 'None');
      
      const profileUrl = `${this.baseUrl}/users/profile`;
      console.log('UserService: Making request to:', profileUrl);
      
      // Test basic connectivity first
      try {
        console.log('UserService: Testing connectivity...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const healthCheck = await fetch(`${this.baseUrl.replace('/api', '')}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log('UserService: Health check status:', healthCheck.status);
      } catch (healthError) {
        console.log('UserService: Health check failed:', healthError.message);
      }
      
      console.log('UserService: Making profile request...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(profileUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log('UserService: Response status:', response.status);
      console.log('UserService: Response ok:', response.ok);
      console.log('UserService: Response headers:', response.headers);

      const result = await response.json();
      console.log('UserService: Response data:', result);
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'PROFILE_FETCH_FAILED', message: `Failed to fetch profile (${response.status})` },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('UserService: Network error:', error);
      console.error('UserService: Error type:', error.constructor.name);
      console.error('UserService: Error message:', error.message);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: `Network error: ${error.message}`,
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