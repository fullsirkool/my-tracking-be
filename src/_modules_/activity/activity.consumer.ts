import { ActivityService } from './activity.service';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ActivityJobs, Queues } from 'src/types/queue.type';

@Processor(Queues.activity)
export class ActivityConsumer {
  constructor(private readonly activityService: ActivityService) {}

  @Process(ActivityJobs.import)
  async handleCreateActivity({ data }: Job) {
    this.activityService.importActivityStatistic(data);
  }
}
