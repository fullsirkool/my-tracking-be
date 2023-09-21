import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { HttpModule } from '@nestjs/axios';
import { ActivityService } from './activity.service';

@Module({
  imports: [HttpModule],
  controllers: [ActivityController],
  providers: [ActivityService]
})
export class ActivityModule {}
