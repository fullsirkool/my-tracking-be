import { Injectable } from '@nestjs/common';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class NotificationService {
  constructor(private readonly telegramService: TelegramService) {
  }

  async sendNotificationViaTelegram({ message }: { message: string }) {
    return this.telegramService.sendMessage({ message });
  }
}
