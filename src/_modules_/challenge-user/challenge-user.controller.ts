import { Controller } from '@nestjs/common';
import { ChallengeUserService } from './challenge-user.service';

@Controller('challenge-user')
export class ChallengeUserController {
  constructor(private readonly challengeUserService: ChallengeUserService) {}
}
