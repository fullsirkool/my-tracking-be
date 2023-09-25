import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { HttpModule } from '@nestjs/axios';
import { ActivityService } from './activity.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [ActivityController],
  providers: [ActivityService]
})
export class ActivityModule {}
