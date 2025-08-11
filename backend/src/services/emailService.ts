import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      const emailConfig: EmailConfig = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || '',
          pass: process.env.EMAIL_PASS || ''
        }
      };

      // Only initialize if we have email credentials
      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.transporter = nodemailer.createTransport(emailConfig);
        this.isConfigured = true;
        logger.info('Email service initialized successfully');
      } else {
        logger.warn('Email service not configured - missing EMAIL_USER or EMAIL_PASS environment variables');
      }
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.error('Email service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}:`, result.messageId);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, nickname: string, verificationToken: string): Promise<boolean> {
    // Generate deep link for mobile app instead of web URL
    const verificationUrl = `mobile-app://verify-email?token=${verificationToken}`;
    const fallbackUrl = `${process.env.FRONTEND_URL || 'http://46.10.214.242:8081'}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Mobile App Skeleton!</h1>
          </div>
          <div class="content">
            <h2>Hi ${nickname},</h2>
            <p>Thank you for registering with us! To complete your registration, please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Open in Mobile App</a>
            </p>
            <p>If you're not on your mobile device, you can also verify using this web link:</p>
            <p style="text-align: center;">
              <a href="${fallbackUrl}" style="color: #007bff; text-decoration: underline;">Verify in Browser</a>
            </p>
            <p style="font-size: 12px; color: #666;">
              Mobile app link: <span style="word-break: break-all;">${verificationUrl}</span><br>
              Web link: <span style="word-break: break-all;">${fallbackUrl}</span>
            </p>
            <p><strong>This verification link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html
    });
  }

  async sendPasswordResetEmail(email: string, nickname: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #dc3545; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${nickname},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
            <p><strong>This reset link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html
    });
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();