import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import crypto from 'crypto';
import { logger } from './logger';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    logger.error('Error verifying password:', error);
    throw new Error('Failed to verify password');
  }
}

/**
 * Generate a JWT access token
 */
export function generateAccessToken(userId: string, email: string): string {
  try {
    const payload: JWTPayload = {
      userId,
      email,
      type: 'access'
    };
    
    const options: SignOptions = {
      expiresIn: JWT_EXPIRES_IN as StringValue,
      issuer: 'mobile-app-skeleton',
      audience: 'mobile-app-users'
    };
    
    return jwt.sign(payload, JWT_SECRET, options);
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
}

/**
 * Generate a JWT refresh token
 */
export function generateRefreshToken(userId: string, email: string): string {
  try {
    const payload: JWTPayload = {
      userId,
      email,
      type: 'refresh'
    };
    
    const options: SignOptions = {
      expiresIn: JWT_REFRESH_EXPIRES_IN as StringValue,
      issuer: 'mobile-app-skeleton',
      audience: 'mobile-app-users'
    };
    
    return jwt.sign(payload, JWT_REFRESH_SECRET, options);
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(userId: string, email: string): TokenPair {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId, email)
  };
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string, type: 'access' | 'refresh' = 'access'): JWTPayload {
  try {
    const secret = type === 'access' ? JWT_SECRET : JWT_REFRESH_SECRET;
    const decoded = jwt.verify(token, secret, {
      issuer: 'mobile-app-skeleton',
      audience: 'mobile-app-users'
    }) as JWTPayload;
    
    if (decoded.type !== type) {
      throw new Error(`Invalid token type. Expected ${type}, got ${decoded.type}`);
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid token type')) {
      throw error; // Re-throw token type errors as-is
    }
    logger.error(`Error verifying ${type} token:`, error);
    throw new Error(`Invalid ${type} token`);
  }
}

/**
 * Generate a secure random verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}