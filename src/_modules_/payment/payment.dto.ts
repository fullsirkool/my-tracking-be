import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { BasePagingDto } from '../../types/base.types';
import { OptionalProperty } from '../../decorators/validator.decorator';

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

export class FindPaymentDto extends BasePagingDto {
  @OptionalProperty()
  createdAt: string;
  @OptionalProperty({ description: 'challenge name or user name' })
  query: string;
  @OptionalProperty()
  challengeId: number;
}
