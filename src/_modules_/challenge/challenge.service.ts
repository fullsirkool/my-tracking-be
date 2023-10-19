import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChallengeCodeDto, CreateChallengeDto } from './challenge.dto';
import { Prisma, ChallengeStatus } from '@prisma/client';

@Injectable()
export class ChallengeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: number, createChallengeDto: CreateChallengeDto) {
    const {
      title,
      startDate,
      endDate,
      status,
      ruleTitle,
      minPace,
      maxPace,
      minDistance,
      maxDistance,
      challengeType,
    } = createChallengeDto;

    const createChallengePayload: Prisma.ChallengeCreateInput = {
      title,
      startDate,
      endDate,
      user: {
        connect: {
          id: ownerId,
        },
      },
      rule: {
        create: {},
      },
    };

    if (status) {
      createChallengePayload.status = status;
    }
    if (status) {
      createChallengePayload.challengeType = challengeType;
    }
    if (minPace) {
      const [minPaceMinute, minPaceSecond] = minPace.split(':');
      const minPaceToSecond = +minPaceMinute * 60 + +minPaceSecond;
      createChallengePayload.rule.create.minPace = minPaceToSecond;
    }

    if (maxPace) {
      const [maxPaceMinute, maxPaceSecond] = maxPace.split(':');
      const maxPaceToSecond = +maxPaceMinute * 60 + +maxPaceSecond;
      createChallengePayload.rule.create.maxPace = maxPaceToSecond;
    }
    if (minDistance) {
      createChallengePayload.rule.create.minDistance = minDistance;
    }

    if (maxDistance) {
      createChallengePayload.rule.create.maxDistance = maxDistance;
    }
    if (ruleTitle) {
      createChallengePayload.rule.create.title = ruleTitle;
    }

    console.log('createChallengePayload', createChallengePayload);

    const challenge = await this.prisma.challenge.create({
      data: createChallengePayload,
    });
    return challenge;
  }

  async getChallengeCode(challengeId: number) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    return `/challenge/join/${challenge.code}`;
  }

  async joinChallenge(userId: number, challengeId: number) {
    // Create new challengeUser
  }
}
