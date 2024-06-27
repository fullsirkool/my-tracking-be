import {Body, Controller, Param, Post, Sse} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CompletePaymentDto } from './payment.dto';
import { ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEvent, Observable, take } from 'rxjs';
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

  @Sse('event/:id')
  sse(@Param('id') id: string): Observable<MessageEvent> {
    console.log('send event!');
    return fromEvent(this.eventEmitter, `complete-payment/${id}`).pipe(
      map((data) => {
        return new MessageEvent('complete-payment', { data });
      }),
    );
  }
}
