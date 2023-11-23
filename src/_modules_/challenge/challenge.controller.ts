import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import {
  CreateChallengeDto,
  FindChallengeDto,
  FindChallengeResponse,
} from './challenge.dto';
import { Auth } from 'src/decorators/auth.decorator';
import { Challenge } from '@prisma/client';
import { BasePagingDto } from 'src/types/base.types';

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

  @Post('/join-test/:id')
  @Auth()
  testImportJoin(@User('id') userId: number, @Param('id') id: number) {
    return this.challengeService.importActivitiesAfterJoinChallenge(
      userId,
      +id,
    );
  }

  @Get('')
  async find(
    @Query() findChallengeDto: FindChallengeDto,
  ): Promise<FindChallengeResponse> {
    return await this.challengeService.find(findChallengeDto);
  }
  @Get('/:id')
  async findOne(@Param('id') id: number): Promise<Challenge> {
    return await this.challengeService.findOne(+id);
  }

  @Get('/:id/user')
  async findUserForChallenge(@Param('id') id: number) {
    return await this.challengeService.findUserForChallenge(id);
  }

  @Get('/user/joined/:stravaId')
  async findJoinedChallengesByUser(
    @Param('stravaId') stravaId: number,
    @Query() pagination: BasePagingDto,
  ) {
    return await this.challengeService.findJoinedChallengesByUser(
      stravaId,
      pagination,
    );
  }

  @Get('/user/created/:stravaId')
  async findCreatedChallengesByUser(
    @Param('stravaId') stravaId: number,
    @Query() pagination: BasePagingDto,
  ) {
    return await this.challengeService.findCreatedChallengesByUser(
      stravaId,
      pagination,
    );
  }
}
