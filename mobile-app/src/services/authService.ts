import { Platform } from 'react-native';
import { ApiResponse, User } from '../types';
import { NetworkConfig } from '../config/network';

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

class AuthService {
  private getBaseUrls(): string[] {
    return NetworkConfig.getApiBaseUrls();
  }

  private get baseUrl(): string {
    return this.getBaseUrls()[0]; // Use first URL as default
  }

  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    console.log('AuthService: Starting login process...');
    console.log('AuthService: Login payload:', { email: data.email, password: '[HIDDEN]' });
    
    const urls = this.getBaseUrls();
    console.log('AuthService: Available URLs:', urls);
    
    // Try each URL until one works
    for (let i = 0; i < urls.length; i++) {
      const baseUrl = urls[i];
      const loginUrl = `${baseUrl}/auth/login`;
      
      try {
        console.log(`AuthService: Attempt ${i + 1}/${urls.length} - Making login request to:`, loginUrl);

        const response = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        console.log('AuthService: Login response status:', response.status);
        console.log('AuthService: Login response ok:', response.ok);

        const result = await response.json();
        console.log('AuthService: Login response data:', result);

        if (!response.ok) {
          return {
            success: false,
            error: result.error || { code: 'LOGIN_FAILED', message: 'Login failed' },
          };
        }

        console.log('✅ AuthService: Login successful with URL:', loginUrl);
        return {
          success: true,
          data: result.data,
        };
      } catch (error) {
        console.error(`AuthService: Login attempt ${i + 1} failed with URL ${loginUrl}:`, error);
        
        // If this is the last URL, return the error
        if (i === urls.length - 1) {
          console.error('AuthService: All login attempts failed');
          return {
            success: false,
            error: {
              code: 'NETWORK_ERROR',
              message: 'Network error occurred - could not connect to server',
              details: error,
            },
          };
        }
        
        // Otherwise, continue to the next URL
        console.log(`AuthService: Trying next URL...`);
      }
    }

    // This should never be reached, but just in case
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'All connection attempts failed',
      },
    };
  }

  async testConnection(): Promise<{ success: boolean; workingUrl?: string }> {
    const urls = this.getBaseUrls();

    for (const baseUrl of urls) {
      try {
        const healthUrl = `${baseUrl.replace('/api', '')}/health`;
        console.log('Testing connection to:', healthUrl);

        const response = await fetch(healthUrl, {
          method: 'GET',
        });

        console.log(`Health check response for ${healthUrl}:`, response.status, response.ok);

        // Accept both 200 (healthy) and 503 (unhealthy but server running)
        if (response.ok || response.status === 503) {
          try {
            const healthData = await response.json();
            // Check if we got a valid health response with database connection
            if (healthData && healthData.database && healthData.database.connected) {
              console.log('✅ Connection successful with:', baseUrl);
              return { success: true, workingUrl: baseUrl };
            }
          } catch (jsonError) {
            console.error('Failed to parse health response:', jsonError);
          }
        }
      } catch (error) {
        console.error(`Connection test failed for ${baseUrl}:`, error);
      }
    }

    console.error('❌ All connection attempts failed');
    return { success: false };
  }

  async register(data: RegisterRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('Starting registration process...');
      console.log('Registration payload:', data);

      // Test connection first and get working URL
      const connectionTest = await this.testConnection();
      console.log('Connection test result:', connectionTest);

      if (!connectionTest.success) {
        return {
          success: false,
          error: {
            code: 'CONNECTION_FAILED',
            message: 'Cannot connect to server. Please check if the backend is running.',
          },
        };
      }

      const workingBaseUrl = connectionTest.workingUrl || this.baseUrl;
      const registerUrl = `${workingBaseUrl}/auth/register`;
      console.log('Making registration request to:', registerUrl);

      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const result = await response.json();
      console.log('Response data:', result);

      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'REGISTER_FAILED', message: 'Registration failed' },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('Network error during registration:', error);
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

  async resendVerificationEmail(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'RESEND_FAILED', message: 'Failed to resend verification email' },
        };
      }

      return {
        success: true,
        data: result,
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

  async checkVerificationStatus(email: string): Promise<ApiResponse<{ isVerified: boolean }>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/verification-status?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'CHECK_FAILED', message: 'Failed to check verification status' },
        };
      }

      return {
        success: true,
        data: result,
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
}

export const authService = new AuthService();