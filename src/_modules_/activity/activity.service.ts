import { DailyActivtyService } from './../daily-activty/daily-activty.service';
import { catchError, firstValueFrom } from 'rxjs';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { AuthService } from '../auth/auth.service';
import {
  ManualCreateActivityDto,
  FindMonthlyActivityDto,
  CreateManyActivitiesDto,
  FindActivityDto,
  FindActivityResponse,
} from './activity.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly dailyActivtyService: DailyActivtyService,
    @InjectQueue('activity') private readonly activityTaskQueue: Queue,
  ) {}

  async find(findActivityDto: FindActivityDto): Promise<FindActivityResponse> {
    const { page, size, date, stravaId } = findActivityDto;
    const skip = (page - 1) * size;

    const findActivityCondition: Prisma.ActivityWhereInput = {};

    if (date) {
      const requestDate = new Date(date);
      const start = new Date(
        requestDate.getFullYear(),
        requestDate.getMonth(),
        1,
      );
      const end = new Date(
        requestDate.getFullYear(),
        requestDate.getMonth() + 1,
        0,
      );

      findActivityCondition.startDateLocal = {
        lte: end,
        gte: start,
      };
    }

    if (stravaId) {
      findActivityCondition.user = {
        stravaId,
      };
    }

    const [activities, count] = await Promise.all([
      this.prisma.activity.findMany({
        skip,
        take: size,
        where: findActivityCondition,
        orderBy: {
          startDateLocal: 'desc',
        },
      }),
      this.prisma.activity.count({
        where: findActivityCondition,
      }),
    ]);

    return {
      data: activities,
      page,
      size,
      totalPages: Math.ceil(count / size) || 0,
      totalElement: count,
    };
  }

  async findStravaActivity(id: number, token: string) {
    const activityUrl = `${process.env.STRAVA_BASE_URL}/activities/${id}`;
    const { data } = await firstValueFrom(
      this.httpService
        .get(activityUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    return data;
  }

  async findOneByActivityId(id: string) {
    return await this.prisma.activity.findUnique({
      where: {
        id: `${id}`,
      },
    });
  }

  async findMonthlyActivity(findMonthlyActivityDto: FindMonthlyActivityDto) {
    const { date, stravaId } = findMonthlyActivityDto;

    if (!stravaId) {
      throw new ForbiddenException('Strava ID Required!');
    }

    const owner = await this.prisma.user.findUnique({
      where: {
        stravaId: +stravaId,
      },
    });

    if (!owner) {
      throw new ForbiddenException('Not Found Owner!');
    }

    const { id } = owner;

    const requestDate = new Date(date);
    const start = new Date(
      requestDate.getFullYear(),
      requestDate.getMonth(),
      1,
    );
    const end = new Date(
      requestDate.getFullYear(),
      requestDate.getMonth() + 1,
      0,
    );
    const res = await this.dailyActivtyService.getMonthlyActivity(
      id,
      start,
      end,
    );
    return res;
  }

  async getTotalStatistics(stravaId: number) {
    if (!stravaId) {
      throw new ForbiddenException('Strava ID Required!');
    }

    const owner = await this.prisma.user.findUnique({
      where: {
        stravaId: +stravaId,
      },
    });

    if (!owner) {
      throw new ForbiddenException('Not Found Owner!');
    }

    const { id } = owner;
    const { _sum, _count } = await this.prisma.activity.aggregate({
      _sum: {
        distance: true,
        movingTime: true,
      },
      _count: {
        id: true,
      },
      where: {
        userId: id,
      },
    });

    const distance = _sum.distance || 0;
    const totalMovingTime = _sum.movingTime || 0;
    const count = _count.id || 0;

    const pace = totalMovingTime ? totalMovingTime / (distance / 1000) / 60 : 0;
    return {
      distance,
      pace,
      count,
      totalMovingTime,
    };
  }

  async getWebhookResponse(createActivityDto) {
    const { object_type, object_id, owner_id, aspect_type } = createActivityDto;

    if (object_type !== 'activity' || aspect_type !== 'create') {
      return;
    }

    const owner = await this.prisma.user.findUnique({
      where: {
        stravaId: owner_id,
      },
    });

    if (!owner) {
      return;
    }

    const { stravaRefreshToken } = owner;

    const tokenRes = await this.authService.resetToken(stravaRefreshToken);

    const { access_token } = tokenRes;

    const foundedActivity = await this.findStravaActivity(
      object_id,
      access_token,
    );

    const res = await this.createActivity(owner.id, foundedActivity);

    return res;
  }

  async createActivity(userId, activityDto) {
    const {
      id,
      name,
      distance,
      moving_time,
      elapsed_time,
      total_elevation_gain,
      start_date,
      start_date_local,
      type,
      visibility,
      average_speed,
      max_speed,
      splits_metric,
    } = activityDto;

    if (type !== 'Run') {
      return;
    }

    const foundedActivity = await this.findOneByActivityId(id);

    if (foundedActivity) {
      throw new ConflictException('Activity already exists!');
    }

    const activity = await this.prisma.activity.create({
      data: {
        id: `${id}`,
        userId,
        name,
        distance,
        movingTime: moving_time,
        elapsedTime: elapsed_time,
        totalElevationGain: total_elevation_gain,
        type,
        startDate: start_date,
        startDateLocal: start_date_local,
        visibility: visibility,
        averageSpeed: average_speed,
        maxSpeed: max_speed,
      },
    });

    // Add Challenge Activity //
    await this.activityTaskQueue.add('import', {
      userId,
      activity,
      splits_metric,
    });

    return activity;
  }

  async importActivityStatistic(data) {
    const { userId, activity, splits_metric } = data;
    if (!activity) {
      return;
    }

    const dailyActivity = await this.dailyActivtyService.updateWebhookEvent(
      activity,
    );

    const { id, distance, movingTime, elapsedTime, startDateLocal } = activity;
    let isValid = true;
    if (distance < 1000) {
      isValid = false;
    }

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

    const challenges = await this.prisma.challengeUser.findMany({
      where: {
        userId,
        challenge: {
          startDate: {
            lte: new Date(),
          },
          endDate: {
            gte: new Date(),
          },
        },
      },
      select: {
        id: true,
        challenge: {
          include: {
            rule: true,
          },
        },
      },
      orderBy: {
        challengeId: 'asc',
      },
    });

    const challengeActivities = challenges.map((element) => {
      const { challenge } = element;
      const { rule } = challenge;
      const { minPace, maxPace, minDistance, maxDistance } = rule;
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
      return {
        activityId: `${id}`,
        challengeId: challenge.id,
        userId,
        isValid,
      };
    });

    await this.prisma.challengeActivity.createMany({
      data: challengeActivities,
    });

    const findDate = new Date(startDateLocal);
    findDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(
      findDate.getFullYear(),
      findDate.getMonth(),
      findDate.getDate() + 1,
    );

    const dailyChallengeActivities =
      await this.prisma.challengeDailyActivity.findMany({
        where: {
          userId,
          startDateLocal: {
            gte: findDate,
            lte: nextDate,
          },
        },
        orderBy: {
          challengeId: 'asc',
        },
      });

    if (!dailyChallengeActivities.length) {
      const challengeDailyActivityPayload = challengeActivities.map((item) => {
        const { challengeId, userId } = item;
        const validActivity = item.isValid;
        return {
          distance: validActivity ? distance : 0,
          movingTime: validActivity ? movingTime : 0,
          elapsedTime: validActivity ? elapsedTime : 0,
          startDateLocal: findDate,
          userId,
          challengeId,
        };
      });
      return await this.prisma.challengeDailyActivity.createMany({
        data: challengeDailyActivityPayload,
      });
    }

    const challengeDailyActivityPayload = dailyChallengeActivities.map(
      (item, index) => {
        const challenge = challengeActivities[index];
        const isValidChallenge = challenge.isValid;
        const { challengeId, userId } = item;
        return {
          distance: isValidChallenge ? distance + item.distance : item.distance,
          movingTime: isValidChallenge
            ? movingTime + item.movingTime
            : item.movingTime,
          elapsedTime: isValidChallenge
            ? elapsedTime + item.elapsedTime
            : item.elapsedTime,
          startDateLocal: findDate,
          challengeId,
          userId,
        };
      },
    );

    return await this.prisma.challengeDailyActivity.updateMany({
      data: challengeDailyActivityPayload,
    });
  }

  async createMany(createManyDto: CreateManyActivitiesDto) {
    const { user, access_token } = createManyDto;
    const currentDate = new Date();

    // Subtract 30 days
    currentDate.setDate(currentDate.getDate() - 30);
    const after = Math.ceil(currentDate.getTime() / 1000);
    const activityUrl = `${process.env.STRAVA_BASE_URL}/athlete/activities`;
    const { data } = await firstValueFrom(
      this.httpService
        .get(activityUrl, {
          params: {
            access_token,
            after,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    const payload = data.map((item) => {
      const {
        id,
        name,
        distance,
        moving_time,
        elapsed_time,
        total_elevation_gain,
        start_date,
        start_date_local,
        type,
        visibility,
        average_speed,
        max_speed,
      } = item;
      return {
        id: `${id}`,
        userId: user.id,
        name,
        distance,
        movingTime: moving_time,
        elapsedTime: elapsed_time,
        totalElevationGain: total_elevation_gain,
        type,
        startDate: start_date,
        startDateLocal: start_date_local,
        visibility: visibility,
        averageSpeed: average_speed,
        maxSpeed: max_speed,
      };
    });
    const activities = await this.prisma.activity.createMany({
      data: payload,
    });
    await this.dailyActivtyService.manualCreateMany(payload);
    return activities;
  }

  async manualCreateActivity(manualCreateActivityDto: ManualCreateActivityDto) {
    const { stravaId, activityId } = manualCreateActivityDto;

    const owner = await this.prisma.user.findUnique({
      where: {
        stravaId: stravaId,
      },
    });

    if (!owner) {
      throw new ForbiddenException('Not Found Owner!');
    }

    const { stravaRefreshToken } = owner;

    const tokenRes = await this.authService.resetToken(stravaRefreshToken);

    const { access_token } = tokenRes;

    const foundedActivity = await this.findStravaActivity(
      activityId,
      access_token,
    );

    const res = await this.createActivity(owner.id, foundedActivity);

    return res;
  }
}
