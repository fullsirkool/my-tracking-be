import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationJobs, Queues } from 'src/types/queue.type';
import { NotificationService } from './notification.service';

@Processor(Queues.notification)
export class NotificationConsumer {
  constructor(private readonly notificationService: NotificationService) {}

  @Process(NotificationJobs.sendTelegram)
  async handleSendNotificationViaTelegram({ data }: Job) {
    return this.notificationService.sendNotificationViaTelegram(data);
  }
}
