import { Controller } from '@nestjs/common';
import { ChallengeGroupService } from './challenge-group.service';

@Controller('challenge-group')
export class ChallengeGroupController {
  constructor(private readonly challengeGroupService: ChallengeGroupService) {}
}
