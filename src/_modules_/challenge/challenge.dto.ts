import { ApiProperty } from '@nestjs/swagger';
import { Challenge, User } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { IsFloat, IsInteger, OptionalProperty } from 'src/decorators/validator.decorator';
import { BasePagingDto } from 'src/types/base.types';
import { BasePagingResponse } from './../../types/base.types';
import { Transform } from 'class-transformer';

export enum Availability {
  ENDED = 'ENDED',
  NOT_ENDED = 'NOT_ENDED'
}

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

  @ApiProperty({ required: true })
  @IsFloat
  target: number;

  @OptionalProperty()
  minPace: string;

  @OptionalProperty()
  maxPace: string;

  @OptionalProperty()
  description: string;

  @OptionalProperty()
  minDistance: number;

  @OptionalProperty()
  maxDistance: number;

  @OptionalProperty()
  ticketPrice: number;
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
  @OptionalProperty()
  @IsEnum(Availability)
  availability: Availability;
}

export class FindChallengeResponse extends BasePagingResponse<Challenge> {
}

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
