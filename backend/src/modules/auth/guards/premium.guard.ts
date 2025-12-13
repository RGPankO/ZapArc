import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class PremiumGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }

    if (user.premiumStatus === 'FREE') {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'PREMIUM_REQUIRED',
          message: 'Premium subscription required',
        },
      });
    }

    return true;
  }
}
