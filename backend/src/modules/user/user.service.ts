import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto/user.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        isVerified: true,
        premiumStatus: true,
        premiumExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      data: { user },
    };
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const { nickname, email } = data;

    if (!nickname && !email) {
      throw new BadRequestException('At least one field (nickname or email) must be provided');
    }

    if (email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new ConflictException('This email address is already in use');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (nickname) updateData.nickname = nickname;
    if (email) {
      updateData.email = email.toLowerCase();
      updateData.isVerified = false;
      updateData.verificationToken = crypto.randomBytes(32).toString('hex');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        nickname: true,
        isVerified: true,
        premiumStatus: true,
        premiumExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`User profile updated: ${updatedUser.email}`);

    return {
      success: true,
      data: { user: updatedUser },
    };
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
    const { currentPassword, newPassword } = data;

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user.passwordHash) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.prisma.session.deleteMany({ where: { userId } });

    this.logger.log(`Password changed for user: ${user.email}`);

    return {
      success: true,
      data: {
        message: 'Password changed successfully. Please log in again.',
      },
    };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId } });
      await tx.payment.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    this.logger.log(`User account deleted: ${user.email}`);

    return {
      success: true,
      data: {
        message: 'Account deleted successfully',
      },
    };
  }
}
