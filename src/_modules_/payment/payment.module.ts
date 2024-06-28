import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { HttpModule } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { Queues } from '../../types/queue.type';

@Module({
  imports: [HttpModule, BullModule.registerQueue({
    name: Queues.challenge,
  })],
  controllers: [PaymentController],
  providers: [PaymentService, EventEmitter2],
  exports: [PaymentService],
})
export class PaymentModule {
}
