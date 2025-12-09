import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Number of salt rounds for bcrypt hashing.
 * Higher values increase security but also increase computation time.
 */
const SALT_ROUNDS = 12;

/**
 * Hashes a plain text password using bcrypt.
 *
 * @param password - The plain text password to hash
 * @returns Promise that resolves to the hashed password
 * @throws Error if password is empty or hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password cannot be empty');
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

/**
 * Compares a plain text password with a hashed password.
 *
 * @param password - The plain text password to verify
 * @param hash - The hashed password to compare against
 * @returns Promise that resolves to true if passwords match, false otherwise
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    return false;
  }
}

/**
 * JWT payload structure for access tokens.
 */
export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

/**
 * Generates a JWT access token for a user.
 *
 * @param userId - The user's unique identifier
 * @param email - The user's email address
 * @returns The signed JWT token
 * @throws Error if JWT_SECRET is not configured
 */
export function generateAccessToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload: JWTPayload = {
    userId,
    email,
    type: 'access',
  };

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Generates a JWT refresh token for a user.
 *
 * @param userId - The user's unique identifier
 * @param email - The user's email address
 * @returns The signed JWT refresh token
 * @throws Error if JWT_REFRESH_SECRET is not configured
 */
export function generateRefreshToken(userId: string, email: string): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }

  const payload: JWTPayload = {
    userId,
    email,
    type: 'refresh',
  };

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verifies and decodes a JWT access token.
 *
 * @param token - The JWT token to verify
 * @returns The decoded JWT payload
 * @throws Error if token is invalid or JWT_SECRET is not configured
 */
export function verifyAccessToken(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

/**
 * Verifies and decodes a JWT refresh token.
 *
 * @param token - The JWT refresh token to verify
 * @returns The decoded JWT payload
 * @throws Error if token is invalid or JWT_REFRESH_SECRET is not configured
 */
export function verifyRefreshToken(token: string): JWTPayload {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw new Error('Refresh token verification failed');
  }
}
