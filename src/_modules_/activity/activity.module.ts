import { Module, forwardRef } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { HttpModule } from '@nestjs/axios';
import { ActivityService } from './activity.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, forwardRef(() => AuthModule)],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
