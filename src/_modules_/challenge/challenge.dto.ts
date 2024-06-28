import { ApiProperty } from '@nestjs/swagger';
import {
  Challenge,
  ChallengeStatus,
  ChallengeType,
  User,
} from '@prisma/client';
import { IsDateString, IsInt, IsNotEmpty, IsString } from 'class-validator';
import {
  IsFloat,
  IsInteger,
  OptionalProperty,
} from 'src/decorators/validator.decorator';
import { BasePagingDto } from 'src/types/base.types';
import { BasePagingResponse } from './../../types/base.types';
import { Transform } from 'class-transformer';

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
  @IsFloat
  target: number;

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

export class FindChallengeDto extends BasePagingDto {
  @OptionalProperty()
  @IsInteger
  userId: number;
}

export class FindChallengeResponse extends BasePagingResponse<Challenge> {}

export interface ChallengeDetailDto extends Challenge {
  userActivities: ChallengeUserActivities[];
}

export class ChallengeUserActivities {
  user: User;
  statistics: ActivityStatistics[];
}

export class ActivityStatistics {
  distance: number;
  movingTime: number;
  elapsedTime: number;
  startDateLocal: Date;
}

export class FindChallengeUserDto extends BasePagingDto {
  @OptionalProperty()
  @Transform((param) => param.value.split(','))
  sort?: string[] = ['totalDistance', 'desc'];
}
