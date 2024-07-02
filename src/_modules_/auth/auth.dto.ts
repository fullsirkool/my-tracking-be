import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsStrongPassword } from 'class-validator';
import { UserClaims } from 'src/types/auth.types';
import { OptionalProperty } from '../../decorators/validator.decorator';

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

export class CompleteUserDto {
  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsStrongPassword()
  @IsNotEmpty()
  password: string;
}

export class SignUpDto {
  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    required: true,
    description: 'This is require field',
  })

  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsNotEmpty()
  sex: string;
}

export class SignInDto {
  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsNotEmpty()
  password: string;
}

export class SignInGoogleDto {
  @ApiProperty({ required: true, description: 'This is required field' })
  @IsNotEmpty()
  token: string;
  @OptionalProperty()
  deviceToken: string;
}
