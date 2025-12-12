import { Controller, Get, Put, Delete, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { CurrentUser, CurrentUserData } from '../../decorators/current-user.decorator';
import { UpdateProfileDto, ChangePasswordDto } from './dto/user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Put('profile')
  @UseGuards(VerifiedEmailGuard)
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(userId, dto);
  }

  @Put('password')
  @UseGuards(VerifiedEmailGuard)
  async changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(userId, dto);
  }

  @Delete('account')
  @UseGuards(VerifiedEmailGuard)
  async deleteAccount(@CurrentUser('id') userId: string) {
    return this.userService.deleteAccount(userId);
  }
}
