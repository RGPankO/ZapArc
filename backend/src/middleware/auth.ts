import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { PrismaClient } from '../generated/prisma';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        nickname: string;
        isVerified: boolean;
        premiumStatus: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required'
        }
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token, 'access');
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired access token'
        }
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      isVerified: user.isVerified,
      premiumStatus: user.premiumStatus
    };

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
}

/**
 * Middleware to require verified email
 */
export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required'
      }
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification required'
      }
    });
  }

  next();
}

/**
 * Middleware to require premium status
 */
export function requirePremium(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required'
      }
    });
  }

  if (req.user.premiumStatus === 'FREE') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PREMIUM_REQUIRED',
        message: 'Premium subscription required'
      }
    });
  }

  next();
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    // Try to verify token
    try {
      const decoded = verifyToken(token, 'access');

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          isVerified: user.isVerified,
          premiumStatus: user.premiumStatus
        };
      }
    } catch (error) {
      // Token is invalid, but we continue without authentication
      logger.debug('Optional auth failed, continuing without user:', error);
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
}