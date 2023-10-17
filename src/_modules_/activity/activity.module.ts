import { Module, forwardRef } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { HttpModule } from '@nestjs/axios';
import { ActivityService } from './activity.service';
import { AuthModule } from '../auth/auth.module';
import { DailyActivtyModule } from '../daily-activty/daily-activty.module';

@Module({
  imports: [HttpModule, forwardRef(() => AuthModule), DailyActivtyModule],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
