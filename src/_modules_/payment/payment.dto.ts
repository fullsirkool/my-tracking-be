import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreatePaymentDto {
  userId: number;
  challengeId: number;
  amount: number;
}

export class CompletePaymentDto {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  message: string;
}