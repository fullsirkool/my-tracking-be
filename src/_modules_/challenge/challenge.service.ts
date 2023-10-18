import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChallengeCodeDto, CreateChallengeDto } from './challenge.dto';
import { Prisma } from '@prisma/client';

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

  async generateChallengeCode(ownerId: number, challengeId: number) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (challenge.ownerId !== ownerId) {
      throw new ForbiddenException("You're not allowed to generate code");
    }

    if (challenge.code) {
      return challenge.code;
    }

    let code = this.generateRandomString(6);

    while (code === challenge.code) {
      code = this.generateRandomString(6);
    }

    const updatedChallenge = await this.prisma.challenge.update({
      data: {
        code,
      },
      where: {
        id: challengeId,
      },
    });

    return updatedChallenge.code;
  }

  private generateRandomString(length) {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    return result;
  }
}
