import { QueueService } from './queue.service';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('activity')
export class ActivityTaskProcessor {
  constructor(private readonly queueService: QueueService) {}

  @Process('import')
  async handleActivityTask(job: Job) {
    return await this.queueService.handleCreateActivity(job.data);
  }

  @Process('add')
  async add(title) {
    return await this.queueService.add(title);
  }
}
