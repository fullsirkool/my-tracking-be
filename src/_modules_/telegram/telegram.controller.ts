import { Body, Controller, Post } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('telegram')
@ApiTags('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('/send_message')
  async sendMessage(@Body() data: SendMessageDto) {
    return this.telegramService.sendMessage(data);
  }
}
