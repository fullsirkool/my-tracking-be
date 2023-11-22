import { Module } from '@nestjs/common';
import { DailyActivityService } from './daily-activty.service';
import { DailyActivityController } from './daily-activty.controller';

@Module({
  controllers: [DailyActivityController],
  providers: [DailyActivityService],
  exports: [DailyActivityService],
})
export class DailyActivtyModule {}
