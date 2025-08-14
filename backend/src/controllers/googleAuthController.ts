import type { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma';
import type { ApiResponse, User } from '../types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface GooglePayload {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  iat: number;
  exp: number;
}

interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class GoogleAuthController {
  async googleLogin(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        const response: ApiResponse<null> = {
          success: false,
          error: {
            code: 'MISSING_ID_TOKEN',
            message: 'ID token is required'
          }
        };
        res.status(400).json(response);
        return;
      }

      // Verify the Google ID token
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload() as GooglePayload;
      
      if (!payload) {
        const response: ApiResponse<null> = {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid Google ID token'
          }
        };
        res.status(400).json(response);
        return;
      }

      const { sub: googleId, email, name, picture, given_name, family_name } = payload;

      // Check if user exists with this Google ID or email
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { email }
          ]
        }
      });

      if (user) {
        // Update existing user with Google info if not already set
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId,
              profilePicture: picture || user.profilePicture,
            }
          });
        }
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            nickname: name || `${given_name} ${family_name}`.trim(),
            googleId,
            profilePicture: picture,
            isEmailVerified: true, // Google emails are pre-verified
            firstName: given_name,
            lastName: family_name,
          }
        });
      }

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          type: 'access'
        },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
      });

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            profilePicture: user.profilePicture,
            isEmailVerified: user.isEmailVerified,
            isPremium: user.isPremium,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          tokens: {
            accessToken,
            refreshToken,
          }
        }
      };

      logger.info(`Google login successful for user: ${user.email}`);
      res.json(response);

    } catch (error) {
      logger.error('Google login error:', error);
      
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'GOOGLE_AUTH_ERROR',
          message: 'Google authentication failed'
        }
      };
      res.status(500).json(response);
    }
  }
}

export const googleAuthController = new GoogleAuthController();