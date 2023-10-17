import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DailyActivtyService } from './daily-activty.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('daily-activty')
@ApiTags('daily-activty')
export class DailyActivtyController {
  constructor(private readonly dailyActivtyService: DailyActivtyService) {}

  @Post('/transform/:userId')
  async transform(@Param('userId') userId: number) {
    return await this.dailyActivtyService.transform(+userId);
  }
}
