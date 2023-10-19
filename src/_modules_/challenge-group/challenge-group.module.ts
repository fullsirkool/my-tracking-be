import { Module } from '@nestjs/common';
import { ChallengeGroupService } from './challenge-group.service';
import { ChallengeGroupController } from './challenge-group.controller';

@Module({
  controllers: [ChallengeGroupController],
  providers: [ChallengeGroupService]
})
export class ChallengeGroupModule {}
