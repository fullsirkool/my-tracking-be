import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsStrongPassword } from 'class-validator';
import { UserClaims } from 'src/types/auth.types';

export class AuthDto {
  expireTime: number;
  accessToken: string;
  refreshToken: string;
  user: UserClaims;
}

export class ChangeTokenDto {
  stravaRefreshToken: string;
}

export class SignInAdminDto {
  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsStrongPassword()
  @IsNotEmpty()
  password: string;
}

export class RenewDto {
  @ApiProperty()
  @IsNotEmpty()
  refreshToken: string;
}
