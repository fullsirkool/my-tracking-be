import {
  ConflictException,
  Injectable,
  NotAcceptableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateChallengeDto,
  FindChallengeDto,
  FindChallengeResponse,
} from './challenge.dto';
import { Prisma, Challenge, ChallengeUser } from '@prisma/client';

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
      challengeUsers: {
        create: {
          user: {
            connect: {
              id: ownerId,
            },
          },
        },
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
      const [minute, second] = minPace.split(':');
      const minPaceToSecond = Number(minute) * 60 + Number(second);
      createChallengePayload.rule.create.minPace = minPaceToSecond;
    }

    if (maxPace) {
      const [minute, second] = maxPace.split(':');
      const maxPaceToSecond = Number(minute) * 60 + Number(second);
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

  async find(
    findChallengeDto: FindChallengeDto,
  ): Promise<FindChallengeResponse> {
    const { page, size, userId, ownerId } = findChallengeDto;
    const skip = (page - 1) * size;

    const findChallengeCondition: Prisma.ChallengeWhereInput = {};

    if (userId) {
      findChallengeCondition.challengeUsers = {
        some: {
          userId,
        },
      };
    }
    if (ownerId) {
      findChallengeCondition.ownerId = ownerId;
    }

    const [challenges, count] = await Promise.all([
      this.prisma.challenge.findMany({
        take: size,
        skip,
        where: findChallengeCondition,
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
          // challengeUsers: {
          //   include: {
          //     user: {
          //       select: {
          //         id: true,
          //         stravaId: true,
          //         firstName: true,
          //         lastName: true,
          //         challengeDailyActivity: {
          //           select: {
          //             id: true,
          //             distance: true,
          //             elapsedTime: true,
          //             movingTime: true,
          //             startDateLocal: true,
          //           },
          //         },
          //       },
          //     },
          //   },
          // },
        },
      }),
      await this.prisma.challenge.count({ where: findChallengeCondition }),
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
        challengeActivity: {
          select: {
            activity: true,
            user: {
              select: {
                id: true,
                stravaId: true,
                firstName: true,
                lastName: true,
                profile: true,
              },
            },
          },
          where: {
            isValid: true,
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

  async joinChallenge(
    userId: number,
    challengeId: number,
  ): Promise<ChallengeUser> {
    const createdChallengeUser = await this.prisma.challengeUser.findFirst({
      where: {
        userId,
        challengeId,
      },
      include: {
        challenge: true,
      },
    });

    if (createdChallengeUser.id) {
      throw new ConflictException('User has joined this challenge!');
    }

    if (createdChallengeUser.challenge.challengeType === 'ONE_VS_ONE') {
      const count = await this.prisma.challengeUser.count({
        where: {
          challengeId,
        },
      });

      if (count >= 2) {
        throw new NotAcceptableException('This challenge is full!');
      }
    }

    return await this.prisma.challengeUser.create({
      data: {
        challenge: {
          connect: {
            id: challengeId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }
}
