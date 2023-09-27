import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber } from "class-validator";

export class ManualCreateActivityDto {
  @ApiProperty({
    required: true,
    description: 'This is require field'
  })
  @IsNumber()
  @IsNotEmpty()
  stravaId: number

  @ApiProperty({
    required: true,
    description: 'This is require field'
  })
  @IsNumber()
  @IsNotEmpty()
  activityId: number
}