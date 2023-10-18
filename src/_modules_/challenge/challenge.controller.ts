import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { CreateChallengeDto } from './challenge.dto';
import { Auth } from 'src/decorators/auth.decorator';

@Controller('challenge')
@ApiTags('challenge')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Post()
  @Auth()
  @ApiBody({ type: CreateChallengeDto })
  // @UseGuards(JwtAuthGuard)
  async create(
    @User('id') userId: number,
    @Body() createChallengeDto: CreateChallengeDto,
  ) {
    return await this.challengeService.create(userId, createChallengeDto);
  }
}
