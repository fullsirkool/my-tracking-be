import { Body, Controller, Post, Sse } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CompletePaymentDto } from './payment.dto';
import { ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEvent, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller('payment')
@ApiTags('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('/complete')
  completeJoinChallenge(@Body() completePaymentDto: CompletePaymentDto) {
    return this.paymentService.complete(completePaymentDto);
  }

  @Sse('sse')
  sse(): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, 'new-payment').pipe(
      map((data) => {
        return new MessageEvent('new-payment', { data: 'new payment' });
      }),
    );
  }
}
