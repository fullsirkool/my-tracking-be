import { Body, Controller, Get, Param, Post, Query, Sse, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CompletePaymentDto, FindPaymentDto } from './payment.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEvent, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtAdminAuthGuard } from '../../guards/jwt-admin-auth.guard';

@Controller('payment')
@ApiTags('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly eventEmitter: EventEmitter2,
  ) {
  }

  @Post('/complete')
  completeJoinChallenge(@Body() completePaymentDto: CompletePaymentDto) {
    return this.paymentService.complete(completePaymentDto);
  }

  @Sse('event/:id')
  sse(@Param('id') id: string): Observable<MessageEvent> {
    console.log('send event!', id);
    return fromEvent(this.eventEmitter, `complete-payment/${id}`).pipe(
      map((data) => {
        return new MessageEvent('complete-payment', { data });
      }),
    );
  }

  @Get('')
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  getPayment(@Query() findPaymentDto: FindPaymentDto) {
    return this.paymentService.find(findPaymentDto);
  }
}
