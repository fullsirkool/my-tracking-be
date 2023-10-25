import { BasePagingResponse } from './../../types/base.types';
import { ApiProperty } from '@nestjs/swagger';
import { Challenge, ChallengeStatus, ChallengeType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsString, Matches } from 'class-validator';
import { IsFloat, OptionalProperty } from 'src/decorators/validator.decorator';
import { BasePagingDto } from 'src/types/base.types';

export class CreateChallengeDto {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: true })
  @IsDateString()
  startDate: Date;

  @ApiProperty({ required: true })
  @IsDateString()
  endDate: Date;

  @ApiProperty({ required: true })
  @IsNotEmpty()
  image: string;

  @OptionalProperty()
  ruleTitle: string;

  @OptionalProperty()
  @IsString()
  minPace: string;

  @OptionalProperty()
  @IsString()
  maxPace: string;

  @OptionalProperty()
  @IsFloat
  minDistance: number;

  @OptionalProperty()
  @IsFloat
  maxDistance: number;

  @ApiProperty({
    enum: ChallengeStatus,
  })
  status: ChallengeStatus;

  @ApiProperty({
    enum: ChallengeType,
  })
  challengeType: ChallengeType;
}

export class CreateChallengeCodeDto {
  @IsInt()
  @IsNotEmpty()
  challengeId: number;
}

export class FindChallengeDto extends BasePagingDto {}
export class FindChallengeResponse extends BasePagingResponse<Challenge> {}
