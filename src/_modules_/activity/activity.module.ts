import {Module, forwardRef} from '@nestjs/common';
import {ActivityController} from './activity.controller';
import {HttpModule} from '@nestjs/axios';
import {ActivityService} from './activity.service';
import {AuthModule} from '../auth/auth.module';
import {DailyActivtyModule} from '../daily-activty/daily-activty.module';
import {BullModule} from '@nestjs/bull';
import {ActivityConsumer} from './activity.consumer';
import {Queues} from 'src/types/queue.type';
import {UserModule} from "../user/user.module";

@Module({
    imports: [
        HttpModule,
        forwardRef(() => AuthModule),
        DailyActivtyModule,
        UserModule,
        BullModule.registerQueue({
            name: Queues.activity,
        }),
    ],
    controllers: [ActivityController],
    providers: [ActivityService, ActivityConsumer],
    exports: [ActivityService],
})
export class ActivityModule {
}
