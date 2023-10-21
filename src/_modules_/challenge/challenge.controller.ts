import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { CreateChallengeDto } from './challenge.dto';
import { Auth } from 'src/decorators/auth.decorator';
import { Challenge, ChallengeStatus, ChallengeType } from '@prisma/client';

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
  ): Promise<Challenge> {
    return await this.challengeService.create(userId, createChallengeDto);
  }

  @Get('/code/:id')
  async generateCode(@Param('id') id: number): Promise<string> {
    return await this.challengeService.getChallengeCode(+id);
  }

  @Post('/join/:id')
  @Auth()
  joinChallenge(@User('id') userId: number, @Param('id') id: number) {
    return this.challengeService.joinChallenge(userId, +id);
  }

  @Get('')
  async find(): Promise<Challenge[]> {
    return await this.challengeService.find();
  }
  @Get('/:id')
  async findOne(@Param('id') id: number): Promise<Challenge> {
    return await this.challengeService.findOne(+id);
  }
}