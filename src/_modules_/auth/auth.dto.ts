import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsStrongPassword } from 'class-validator';

export class AuthDto {
  token: string;
  expireTime: number;
  stravaId: number;
}

export class ChangeTokenDto {
  accessToken: string;
  accessTokenExpireTime: number;
  refreshToken: string;
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
