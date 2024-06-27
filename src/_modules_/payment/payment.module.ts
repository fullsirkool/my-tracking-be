import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { HttpModule } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Module({
  imports: [HttpModule],
  controllers: [PaymentController],
  providers: [PaymentService, EventEmitter2],
  exports: [PaymentService],
})
export class PaymentModule {}
