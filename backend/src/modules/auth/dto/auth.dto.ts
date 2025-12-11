export class RegisterDto {
  email: string;
  nickname: string;
  password: string;
}

export class LoginDto {
  email: string;
  password: string;
}

export class VerifyEmailDto {
  token: string;
}

export class RefreshTokenDto {
  refreshToken: string;
}

export class LogoutDto {
  refreshToken: string;
}

export class GoogleLoginDto {
  idToken: string;
}
