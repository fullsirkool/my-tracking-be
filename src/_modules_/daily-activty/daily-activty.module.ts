import { Module } from '@nestjs/common';
import { DailyActivtyService } from './daily-activty.service';
import { DailyActivtyController } from './daily-activty.controller';

@Module({
  controllers: [DailyActivtyController],
  providers: [DailyActivtyService],
  exports: [DailyActivtyService],
})
export class DailyActivtyModule {}
