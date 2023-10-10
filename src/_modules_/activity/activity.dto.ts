import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Activity, User } from '@prisma/client';
import { IsDateString } from 'class-validator';
import { IsInterger } from 'src/decorators/validator.decorator';

export type ShortActivity = Pick<
  Activity,
  'id' | 'distance' | 'startDate' | 'isValid'
>;
export class ManualCreateActivityDto {
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
  @IsNumber()
  @IsNotEmpty()
  activityId: number;
}

export class FindMonthlyActivityDto {
  @ApiProperty()
  @IsDateString()
  date: Date = new Date();

  @ApiProperty()
  @IsInterger
  stravaId: number;
}

export class CreateManyActivitiesDto {
  access_token: string;
  user: User;
}
