import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateChallengeDto,
  FindChallengeDto,
  FindChallengeResponse,
} from './challenge.dto';
import { Prisma, Challenge } from '@prisma/client';

@Injectable()
export class ChallengeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: number,
    createChallengeDto: CreateChallengeDto,
  ): Promise<Challenge> {
    const {
      title,
      startDate,
      endDate,
      status,
      image,
      ruleTitle,
      minPace,
      maxPace,
      minDistance,
      maxDistance,
      challengeType,
    } = createChallengeDto;

    console.log('createChallengeDto', createChallengeDto);

    const createChallengePayload: Prisma.ChallengeCreateInput = {
      title,
      startDate,
      endDate,
      owner: {
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
    if (challengeType) {
      createChallengePayload.challengeType = challengeType;
    }
    if (image) {
      createChallengePayload.image = image;
    }
    if (minPace) {
      createChallengePayload.rule.create.minPace = minPace;
    }

    if (maxPace) {
      createChallengePayload.rule.create.maxPace = maxPace;
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

  async find(
    findChallengeDto: FindChallengeDto,
  ): Promise<FindChallengeResponse> {
    const { page, size } = findChallengeDto;
    const skip = (page - 1) * size;
    const [challenges, count] = await Promise.all([
      this.prisma.challenge.findMany({
        take: size,
        skip,
        include: {
          owner: {
            select: {
              id: true,
              stravaId: true,
              firstName: true,
              lastName: true,
              profile: true,
            },
          },
        },
      }),
      await this.prisma.challenge.count({}),
    ]);
    return {
      data: challenges,
      page,
      size,
      totalPages: Math.ceil(count / size) || 0,
      totalElement: count,
    };
  }

  async findOne(id: number): Promise<Challenge> {
    const challenge = await this.prisma.challenge.findUnique({
      where: {
        id,
      },
      include: {
        owner: {
          select: {
            id: true,
            stravaId: true,
            firstName: true,
            lastName: true,
            profile: true,
          },
        },
      },
    });

    return challenge;
  }

  async getChallengeCode(challengeId: number): Promise<string> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    return `/challenge/join/${challenge.code}`;
  }

  async joinChallenge(userId: number, challengeId: number) {
    // Create new challengeUser
  }
}
