import { Module } from '@nestjs/common';
import { ChallengeUserService } from './challenge-user.service';
import { ChallengeUserController } from './challenge-user.controller';

@Module({
  controllers: [ChallengeUserController],
  providers: [ChallengeUserService],
})
export class ChallengeUserModule {}
