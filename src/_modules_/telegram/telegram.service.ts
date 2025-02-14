import { Injectable } from '@nestjs/common';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class TelegramService {

  private readonly baseUrl = `${process.env.TELEGRAN_BASE_URL}${process.env.TELEGRAM_BOT_TOKEN}`;

  constructor(private httpService: HttpService) {
  }

  async sendMessage(chatData: SendMessageDto): Promise<void> {
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post(`${this.baseUrl}/sendMessage`, {
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: chatData.message,
            message_thread_id: process.env.TELEGRAM_TOPIC_ID,
          })
          .pipe(
            catchError((error: AxiosError) => {
              console.error(error);
              throw 'An error happened!';
            }),
          ),
      );
      console.log(data);
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
    }
  }
}
