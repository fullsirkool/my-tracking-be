import { Controller } from '@nestjs/common';
import { LeagueService } from './league.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('league')
@ApiTags('league')
export class LeagueController {
  constructor(private readonly leagueService: LeagueService) {}
}
