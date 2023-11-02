import {
  ConflictException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChallengeDetailDto,
  ChallengeUserActivities,
  CreateChallengeDto,
  FindChallengeDto,
  FindChallengeResponse,
} from './challenge.dto';
import {
  Prisma,
  Challenge,
  ChallengeUser,
  User,
  Activity,
} from '@prisma/client';

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
      target,
      minPace,
      maxPace,
      minDistance,
      maxDistance,
      challengeType,
    } = createChallengeDto;

    const startDateInput = new Date(startDate);
    startDateInput.setHours(0, 0, 0, 0);
    const endDateInput = new Date(endDate);
    endDateInput.setHours(24, 0, 0, 0);

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
    if (target) {
      createChallengePayload.rule.create.target = target * 1000;
    }

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

  async findOne(id: number) {
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
        rule: true,
        // challengeDailyActivity: {
        //   select: {
        //     id: true,
        //     distance: true,
        //     elapsedTime: true,
        //     movingTime: true,
        //     startDateLocal: true,
        //     user: {
        //       select: {
        //         id: true,
        //         stravaId: true,
        //         firstName: true,
        //         lastName: true,
        //         profile: true,
        //       },
        //     },
        //   },
        // },
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
          orderBy: {
            activity: {
              startDateLocal: 'asc',
            },
          },
        },
      },
    });

    if (!challenge) {
      throw new NotFoundException('Not found challenge!');
    }

    const { challengeActivity } = challenge;

    const userActivitites = this.myFunction(challengeActivity);
    const result = { ...challenge, userActivitites: userActivitites };
    delete result.challengeActivity;
    return result;
  }

  private myFunction(challengeActivity) {
    const groupedData = {};

    challengeActivity.forEach((activity) => {
      const userId = activity.user.id;
      const startDateString = new Date(
        activity.activity.startDateLocal,
      ).toISOString();
      const startDateLocal = startDateString.split('T')[0]; // Extract the date part

      if (!groupedData[userId]) {
        // Initialize a new entry for the user
        groupedData[userId] = {
          user: activity.user,
          statistics: {},
        };
      }

      if (!groupedData[userId].statistics[startDateLocal]) {
        // Initialize a new entry for the date
        groupedData[userId].statistics[startDateLocal] = {
          elapsedTime: 0,
          distance: 0,
          movingTime: 0,
          startDateLocal: new Date(startDateLocal),
        };
      }

      // Update the sums for the date
      groupedData[userId].statistics[startDateLocal].elapsedTime +=
        activity.activity.elapsedTime;
      groupedData[userId].statistics[startDateLocal].distance +=
        activity.activity.distance;
      groupedData[userId].statistics[startDateLocal].movingTime +=
        activity.activity.movingTime;
    });

    // Convert the grouped data object into an array
    const transformedData = Object.values(groupedData).map(
      (entry: { user: User; statistics: Array<{ activity: Activity }> }) => ({
        user: entry.user,
        statistics: Object.values(entry.statistics),
      }),
    );
    return transformedData;
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
