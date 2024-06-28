import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { CreateChallengeDto, FindChallengeDto, FindChallengeResponse, FindChallengeUserDto } from './challenge.dto';
import { Auth } from 'src/decorators/auth.decorator';
import { Challenge } from '@prisma/client';
import { BasePagingDto } from 'src/types/base.types';
import { JwtAdminAuthGuard } from '../../guards/jwt-admin-auth.guard';

@Controller('challenge')
@ApiTags('challenge')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {
  }

  @Post()
  @UseGuards(JwtAdminAuthGuard)
  @ApiBody({ type: CreateChallengeDto })
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  async create(
    @Body() createChallengeDto: CreateChallengeDto,
  ): Promise<Challenge> {
    return await this.challengeService.create(createChallengeDto);
  }

  @Get('/code/:id')
  async generateCode(@Param('id') id: number): Promise<string> {
    return await this.challengeService.getChallengeCode(+id);
  }

  @Post('/join/:id')
  @Auth()
  joinChallenge(@User('id') userId: number, @Param('id') id: number) {
    // return this.challengeService.joinChallenge(userId, +id);
    return this.challengeService.joinChallengeNew(userId, +id);
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
  async findUserForChallenge(@Param('id') id: number, @Query() findChallengeUserDto: FindChallengeUserDto) {
    return await this.challengeService.findUserForChallenge(id, findChallengeUserDto);
  }

  @Get('/user/joined/:id')
  async findJoinedChallengesByUser(
    @Param('id') id: number,
    @Query() pagination: BasePagingDto,
  ) {
    return await this.challengeService.findJoinedChallengesByUser(
      id,
      pagination,
    );
  }

  @Get('/check-join/:id')
  @Auth()
  async checkJoinedChallengeUser(
    @Param('id') challengeId: number,
    @User('id') userId: number,
  ) {
    return await this.challengeService.checkJoinChallenge(
      {
        challengeId,
        userId,
      },
    );
  }
}
