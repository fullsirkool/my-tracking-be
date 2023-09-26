import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsStrongPassword } from 'class-validator';

export class CreateAdminDto {
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
