import {Module} from '@nestjs/common';
import {ChallengeService} from './challenge.service';
import {ChallengeController} from './challenge.controller';
import {JwtStrategy} from 'src/strategies/jwt.strategy';
import {ActivityModule} from '../activity/activity.module';
import {AuthModule} from '../auth/auth.module';
import {BullModule} from '@nestjs/bull';
import {Queues} from '../../types/queue.type';
import {ChallengeConsumer} from './challenge.comsumer';
import {UserModule} from "../user/user.module";

@Module({
    imports: [
        ActivityModule,
        AuthModule,
        UserModule,
        BullModule.registerQueue({
            name: Queues.challenge,
        }),
    ],
    controllers: [ChallengeController],
    providers: [ChallengeService, JwtStrategy, ChallengeConsumer],
})
export class ChallengeModule {
}
