import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ActivityTaskProcessor } from 'src/jobs/activity-task.job';

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
  ],
  providers: [ActivityTaskProcessor],
  exports: [BullModule],
})
export class QueueModule {}
