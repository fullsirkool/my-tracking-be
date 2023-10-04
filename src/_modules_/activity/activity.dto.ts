import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Activity } from '@prisma/client';
import { IsDateString } from 'class-validator';

export type ShortActivity = Pick<
  Activity,
  'id' | 'distance' | 'startDate' | 'type' | 'isValid'
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
}
