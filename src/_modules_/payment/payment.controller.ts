import { Body, Controller, Post, Res, Sse } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CompletePaymentDto } from './payment.dto';
import { ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEvent, Observable, take } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

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
  sse(@Res() res: Response): Observable<MessageEvent> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    console.log('send event!');
    return fromEvent(this.eventEmitter, 'new-payment').pipe(
      take(1),
      map((data) => {
        return new MessageEvent('new-payment', { data: 'new payment' });
      }),
    );
  }
}
