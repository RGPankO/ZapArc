export class UpdateProfileDto {
  nickname?: string;
  email?: string;
}

export class ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
