import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber } from 'class-validator';
import { Activity, User } from '@prisma/client';
import { IsFloat, IsInteger, OptionalProperty } from 'src/decorators/validator.decorator';
import { BasePagingDto, BasePagingResponse } from 'src/types/base.types';

export type ShortActivity = Pick<Activity, 'id' | 'distance' | 'startDate'>;

export class ManualImportActivityDto {
  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsNumber()
  @IsNotEmpty()
  stravaId: number;

  @ApiProperty({
    required: true,
    description: 'This is require field',
  })
  @IsNotEmpty()
  activityId: string;
}

export class FindMonthlyActivityDto {
  @ApiProperty()
  @IsDateString()
  date: Date = new Date();

  @ApiProperty()
  @IsInteger
  id: number;
}

export class CreateManyActivitiesDto {
  access_token: string;
  user: User;
}

export class FindActivityDto extends BasePagingDto {
  @ApiProperty()
  @IsDateString()
  date: Date = new Date();

  @ApiProperty()
  @IsInteger
  id: number;
}

export class FindActivityResponse extends BasePagingResponse<Activity> {
}

export class DeleteActivityDto {
  @ApiProperty()
  @IsInteger
  stravaId: number;
}

export class ManualCreateActivityDto {
  @ApiProperty()
  @IsFloat
  distance: number;
  @ApiProperty()
  @IsDateString()
  startDate: string;
  @OptionalProperty()
  movingTime: string;
  @OptionalProperty()
  imageUrl: string;
}