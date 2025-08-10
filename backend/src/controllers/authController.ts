import type { Request, Response } from 'express';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';

/**
 * Register a new user
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, nickname, password } = req.body;
    
    const result = await authService.register({
      email,
      nickname,
      password
    });

    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Register controller error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
}

/**
 * Login user
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    
    const result = await authService.login({
      email,
      password
    });

    const statusCode = result.success ? 200 : 401;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Login controller error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
}

/**
 * Verify email address
 */
export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.body;
    
    const result = await authService.verifyEmail({ token });

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Verify email controller error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
}

/**
 * Refresh access token
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    
    const result = await authService.refreshToken({ refreshToken });

    const statusCode = result.success ? 200 : 401;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Refresh token controller error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
}

/**
 * Logout user
 */
export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    
    const result = await authService.logout(refreshToken);

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Logout controller error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
}

/**
 * Get current user profile (protected route)
 */
export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Get profile controller error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
}