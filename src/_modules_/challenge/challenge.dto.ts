import { BasePagingResponse } from './../../types/base.types';
import { ApiProperty } from '@nestjs/swagger';
import { Challenge, ChallengeStatus, ChallengeType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, Matches, min } from 'class-validator';
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
  @Transform(
    ({ value }) => {
      const [minute, second] = value.split(':');
      return minute * 60 + +second;
    },
    { toClassOnly: true },
  )
  @Matches(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'minPace should be in "mm:ss" format',
  })
  minPace: number;

  @OptionalProperty()
  @Transform(
    ({ value }) => {
      const [minute, second] = value.split(':');
      return minute * 60 + +second;
    },
    { toClassOnly: true },
  )
  @Matches(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'maxPace should be in "mm:ss" format',
  })
  maxPace: number;

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
