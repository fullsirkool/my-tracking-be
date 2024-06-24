import {
  ConflictException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import {
  Activity,
  Challenge,
  ChallengeUser,
  Prisma,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateChallengeDto,
  FindChallengeDto,
  FindChallengeResponse,
} from './challenge.dto';
import { BasePagingDto, BasePagingResponse } from 'src/types/base.types';
import { getDefaultPaginationReponse } from 'src/utils/pagination.utils';
import * as moment from 'moment-timezone';
import { ActivityService } from '../activity/activity.service';
import { AuthService } from '../auth/auth.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UserService } from '../user/user.service';

@Injectable()
export class ChallengeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    @InjectQueue('challenge') private readonly challengeTaskQueue: Queue,
  ) {}

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
      startDate: startDateInput,
      endDate: endDateInput,
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
        orderBy: {
          startDate: 'desc',
        },
      }),
      await this.prisma.challenge.count({ where: findChallengeCondition }),
    ]);
    return {
      ...getDefaultPaginationReponse(findChallengeDto, count),
      data: challenges,
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

    const userActivities =
      this.transformActivityToStatistics(challengeActivity);
    const result = { ...challenge, userActivities: userActivities };
    delete result.challengeActivity;
    return result;
  }

  private transformActivityToStatistics(challengeActivity) {
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

  async findUserForChallenge(id: number) {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profile: true,
        stravaId: true,
        challengeDailyActivity: {
          where: {
            challengeId: id,
          },
        },
      },
      where: {
        challengeUsers: {
          some: {
            challengeId: id,
          },
        },
      },
    });

    return users;
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

    if (createdChallengeUser) {
      throw new ConflictException('User has joined this challenge!');
    }

    const challenge = await this.prisma.challenge.findUnique({
      where: {
        id: challengeId,
      },
    });

    if (!challenge) {
      throw new NotFoundException('Not Found Challenge!');
    }

    const challengeUser = await this.prisma.challengeUser.create({
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

    // Add Challenge Activity //
    await this.challengeTaskQueue.add('import-activity', {
      userId,
      challengeId,
    });

    return challengeUser;
  }

  async importActivitiesAfterJoinChallenge(
    userId: number,
    challengeId: number,
  ) {
    const challenge = await this.prisma.challenge.findUnique({
      where: {
        id: challengeId,
      },
      include: {
        rule: true,
      },
    });

    if (!challenge) {
      throw new NotFoundException('Not found challenge!');
    }

    const { startDate, endDate, rule } = challenge;
    const diff = moment().diff(moment(endDate), 'seconds');

    if (diff > 0) {
      throw new NotAcceptableException('Challenge is end!');
    }
    const activityIds = await this.prisma.activity.findMany({
      where: {
        userId,
        startDateLocal: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        timezone: true,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    const { stravaRefreshToken } = user;

    const tokenRes = await this.authService.resetToken(stravaRefreshToken);

    const { access_token } = tokenRes;

    const { minPace, maxPace, minDistance, maxDistance } = rule;

    const createChallengeActivityInput = [];

    const activities = await Promise.all(
      activityIds.map(async (item) => {
        const activityId = item.id;
        const { timezone } = item;
        const activity = await this.activityService.findStravaActivity(
          `${activityId}`,
          access_token,
        );
        const {
          distance,
          moving_time,
          elapsed_time,
          start_date_local,
          splits_metric,
        } = activity;

        let activityMinPace =
          splits_metric[0].moving_time / (splits_metric[0].distance / 1000);
        let activityMaxPace =
          splits_metric[0].moving_time / (splits_metric[0].distance / 1000);

        splits_metric.forEach((element) => {
          const { distance, moving_time } = element;
          if (distance < 100) {
            return;
          }

          const pace = moving_time / (distance / 1000);
          activityMinPace = Math.min(activityMinPace, pace);
          activityMaxPace = Math.max(activityMaxPace, pace);
        });

        let isValid = true;

        if (minDistance) {
          if (distance < minDistance) {
            isValid = false;
          }
        }
        if (maxDistance) {
          if (distance > maxDistance) {
            isValid = false;
          }
        }
        if (maxPace) {
          if (activityMaxPace > maxPace) {
            isValid = false;
          }
        }
        if (minPace) {
          if (activityMinPace < minPace) {
            isValid = false;
          }
        }

        createChallengeActivityInput.push({
          userId,
          challengeId,
          activityId: `${activityId}`,
          isValid,
        });

        const formattedDate = moment(start_date_local)
          .tz(timezone)
          .utcOffset(0);
        const startDateFormatted = moment(formattedDate)
          .startOf('day')
          .format('YYYY-MM-DD 00:00:00');

        return {
          activityId,
          distance,
          moving_time,
          elapsed_time,
          start_date_local,
          splits_metric,
          timezone,
          startDateFormatted,
          isValid,
        };
      }),
    );

    const challengeActivities = await this.prisma.challengeActivity.createMany({
      data: createChallengeActivityInput,
    });

    const challengeDailyActivitiesInput: Prisma.ChallengeDailyActivityCreateManyInput[] =
      Object.values(
        activities.reduce((accumulator, item) => {
          const { isValid, startDateFormatted } = item;

          if (!accumulator[startDateFormatted]) {
            accumulator[startDateFormatted] = {
              distance: 0,
              movingTime: 0,
              elapsedTime: 0,
              startDateLocal: new Date(startDateFormatted).toISOString(),
              userId,
              challengeId,
            };
          }

          if (isValid) {
            accumulator[startDateFormatted].distance += item.distance;
            accumulator[startDateFormatted].movingTime += item.moving_time;
            accumulator[startDateFormatted].elapsedTime += item.elapsed_time;
          }

          return accumulator;
        }, {} as Record<string, Prisma.ChallengeDailyActivityCreateManyInput>),
      );
    await this.prisma.challengeDailyActivity.createMany({
      data: challengeDailyActivitiesInput,
    });
    return challengeActivities;
  }

  async findJoinedChallengesByUser(
    id: number,
    pagination: BasePagingDto,
  ): Promise<BasePagingResponse<Challenge>> {
    const user = await this.userService.findOne(id);

    if (!user) {
      throw new NotFoundException('Not found user!');
    }

    const { page, size } = pagination;
    const skip = (page - 1) * size;

    const findConditions: Prisma.ChallengeWhereInput = {
      challengeUsers: {
        some: {
          userId: user.id,
        },
      },
    };
    const [challenges, count] = await Promise.all([
      this.prisma.challenge.findMany({
        take: size,
        skip,
        where: findConditions,
        orderBy: {
          startDate: 'desc',
        },
      }),
      this.prisma.challenge.count({ where: findConditions }),
    ]);

    return {
      ...getDefaultPaginationReponse(pagination, count),
      data: challenges,
    };
  }

  async findCreatedChallengesByUser(
    id: number,
    pagination: BasePagingDto,
  ): Promise<BasePagingResponse<Challenge>> {
    const user = await this.userService.findOne(id);

    if (!user) {
      throw new NotFoundException('Not found user!');
    }

    const { page, size } = pagination;
    const skip = (page - 1) * size;

    const [challenges, count] = await Promise.all([
      this.prisma.challenge.findMany({
        take: size,
        skip,
        where: {
          ownerId: user.id,
        },
        orderBy: {
          startDate: 'desc',
        },
      }),
      this.prisma.challenge.count({ where: { ownerId: user.id } }),
    ]);
    return {
      ...getDefaultPaginationReponse(pagination, count),
      data: challenges,
    };
  }
}
