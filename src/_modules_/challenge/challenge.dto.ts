import { ApiProperty } from '@nestjs/swagger';
import { ChallengeStatus } from '@prisma/client';
import { IsDateString, IsNotEmpty } from 'class-validator';
import { IsFloat } from 'src/decorators/validator.decorator';

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

  @ApiProperty()
  ruleTitle: string;

  @ApiProperty()
  @IsFloat
  minPace: string;

  @ApiProperty()
  @IsFloat
  maxPace: string;

  @ApiProperty()
  @IsFloat
  minDistance: number;

  @ApiProperty()
  @IsFloat
  maxDistance: number;

  @ApiProperty({
    enum: ChallengeStatus,
  })
  status: ChallengeStatus;
}
