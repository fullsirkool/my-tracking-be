import { Controller, Param, Post } from '@nestjs/common';
import { DailyActivityService } from './daily-activty.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('daily-activity')
@ApiTags('daily-activity')
export class DailyActivityController {
  constructor(private readonly dailyActivityService: DailyActivityService) {}

  @Post('/transform/:userId')
  async transform(@Param('userId') userId: number) {
    return this.dailyActivityService.transform(+userId);
  }
}
