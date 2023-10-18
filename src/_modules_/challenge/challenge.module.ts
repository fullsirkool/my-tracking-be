import { Module } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';
import { JwtStrategy } from 'src/strategies/jwt.strategy';

@Module({
  controllers: [ChallengeController],
  providers: [ChallengeService,  JwtStrategy]
})
export class ChallengeModule {}
