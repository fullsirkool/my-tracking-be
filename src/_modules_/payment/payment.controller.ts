import { Body, Controller, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CompletePaymentDto } from './payment.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('payment')
@ApiTags('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('/complete')
  completeJoinChallenge(@Body() completePaymentDto: CompletePaymentDto) {
    return this.paymentService.complete(completePaymentDto);
  }
}
