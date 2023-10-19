import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { CreateChallengeDto } from './challenge.dto';
import { Auth } from 'src/decorators/auth.decorator';
import { ChallengeStatus, ChallengeType } from '@prisma/client';

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

  @Get('/code/:id')
  generateCode(@Param('id') id: number) {
    return this.challengeService.getChallengeCode(+id);
  }

  @Post('/join/:id')
  @Auth()
  joinChallenge(@User('id') userId: number, @Param('id') id: number) {
    return this.challengeService.joinChallenge(userId, +id);
  }

  @Get('/utilities')
  getStatus() {
    return {
      states: ChallengeStatus,
      types: ChallengeType,
    };
  }
}
