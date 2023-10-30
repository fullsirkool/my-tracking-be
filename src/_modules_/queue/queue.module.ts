import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ActivityTaskProcessor } from 'src/_modules_/queue/activity-task.job';
import { DailyActivtyModule } from '../daily-activty/daily-activty.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'activity',
    }),
    DailyActivtyModule
  ],
  providers: [ActivityTaskProcessor],
  exports: [BullModule],
})
export class QueueModule {}
