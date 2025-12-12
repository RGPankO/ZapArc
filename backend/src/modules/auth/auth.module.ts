import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { VerifiedEmailGuard } from './guards/verified-email.guard';
import { PremiumGuard } from './guards/premium.guard';
import { EmailModule } from '../email/email.module';
import { environmentConfig } from '../../config/config';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: environmentConfig.jwt.secret,
      signOptions: {
        expiresIn: environmentConfig.jwt.expiresIn,
        issuer: 'mobile-app-skeleton',
        audience: 'mobile-app-users',
      },
    }),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleAuthService,
    JwtStrategy,
    JwtAuthGuard,
    VerifiedEmailGuard,
    PremiumGuard,
  ],
  exports: [AuthService, JwtAuthGuard, VerifiedEmailGuard, PremiumGuard],
})
export class AuthModule {}
