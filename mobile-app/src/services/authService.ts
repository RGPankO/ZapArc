import { Platform } from 'react-native';
import { ApiResponse, User } from '../types';

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
  token: string;
}

class AuthService {
  private getBaseUrls(): string[] {
    // Return multiple URLs to try in order
    if (Platform.OS === 'web') {
      return [
        'http://localhost:3000/api',
        'http://127.0.0.1:3000/api',
        'http://192.168.1.5:3000/api'
      ];
    } else if (Platform.OS === 'android') {
      return [
        'http://10.0.2.2:3000/api',
        'http://192.168.1.5:3000/api'
      ];
    } else {
      return [
        'http://localhost:3000/api',
        'http://192.168.1.5:3000/api'
      ];
    }
  }

  private get baseUrl(): string {
    return this.getBaseUrls()[0]; // Use first URL as default
  }

  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      console.log('Starting login process...');
      console.log('Login payload:', { email: data.email, password: '[HIDDEN]' });
      
      const loginUrl = `${this.baseUrl}/auth/login`;
      console.log('Making login request to:', loginUrl);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('Login response status:', response.status);
      console.log('Login response ok:', response.ok);

      const result = await response.json();
      console.log('Login response data:', result);
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: 'LOGIN_FAILED', message: 'Login failed' },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('Network error during login:', error);
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

  async testConnection(): Promise<{ success: boolean; workingUrl?: string }> {
    const urls = this.getBaseUrls();
    
    for (const baseUrl of urls) {
      try {
        const healthUrl = `${baseUrl.replace('/api', '')}/health`;
        console.log('Testing connection to:', healthUrl);
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          timeout: 5000, // 5 second timeout
        });
        
        console.log(`Health check response for ${healthUrl}:`, response.status, response.ok);
        
        if (response.ok) {
          console.log('✅ Connection successful with:', baseUrl);
          return { success: true, workingUrl: baseUrl };
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