import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TelegramModule } from '../telegram/telegram.module';
import { NotificationConsumer } from './notification.consumer';

@Module({
  imports: [TelegramModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationConsumer],
  exports: [NotificationService]
})
export class NotificationModule {
}
