import { DailyActivityService } from '../daily-activty/daily-activty.service';
import { catchError, firstValueFrom } from 'rxjs';
import { ConflictException, ForbiddenException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { AuthService } from '../auth/auth.service';
import {
  CreateManyActivitiesDto,
  FindActivityDto,
  FindActivityResponse,
  FindMonthlyActivityDto,
  ManualCreateActivityDto,
  ManualImportActivityDto,
  SendNotificationDto,
} from './activity.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Activity, ActivityType, Prisma } from '@prisma/client';
import { getDefaultPaginationReponse } from 'src/utils/pagination.utils';
import { DateRangeType, getDateRange } from '../../utils/date-range.utils';
import { UserService } from '../user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationJobs } from '../../types/queue.type';
import * as process from 'node:process';

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly dailyActivityService: DailyActivityService,
    private readonly userService: UserService,
    @InjectQueue('activity') private readonly activityTaskQueue: Queue,
    @InjectQueue('notification') private readonly notificationTaskQueue: Queue,
  ) {
  }

  async find(findActivityDto: FindActivityDto): Promise<FindActivityResponse> {
    const { page, size, date, id } = findActivityDto;
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

    if (id) {
      findActivityCondition.user = {
        id,
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
      ...getDefaultPaginationReponse(findActivityDto, count),
      data: activities,
    };
  }

  async findStravaActivity(id: string, token: string) {
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

  z;

  async findOneByActivityId(id: string) {
    return this.prisma.activity.findUnique({
      where: {
        id: `${id}`,
      },
    });
  }

  async findMonthlyActivity(findMonthlyActivityDto: FindMonthlyActivityDto) {
    const { date, id } = findMonthlyActivityDto;

    if (!id) {
      throw new ForbiddenException('Strava ID Required!');
    }

    const owner = await this.userService.findOne(+id);

    if (!owner) {
      throw new ForbiddenException('Not Found Owner!');
    }

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
    return this.dailyActivityService.getMonthlyActivity(id, start, end);
  }

  async getTotalStatistics(id: number) {
    if (!id) {
      throw new ForbiddenException('Strava ID Required!');
    }

    const owner = await this.userService.findOne(+id);

    if (!owner) {
      throw new ForbiddenException('Not Found Owner!');
    }

    const { _sum, _count } = await this.prisma.activity.aggregate({
      _sum: {
        distance: true,
        movingTime: true,
      },
      _count: {
        id: true,
      },
      where: {
        userId: owner.id,
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

    const owner = await this.userService.findByStravaId(owner_id);

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

    return this.createActivity(owner.id, foundedActivity);
  }

  async createActivity(userId: number, activityDto) {
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
      timezone,
    } = activityDto;

    const match = timezone.match(/\((GMT[+-]\d{2}:\d{2})\) (.+)/);
    const timezoneIdentifier: string = match ? match[2] : undefined;

    if (type !== 'Run') {
      return;
    }

    const foundedActivity = await this.findOneByActivityId(id);

    if (foundedActivity) {
      throw new ConflictException('Activity already exists!');
    }

    const createActivityPayload: Prisma.ActivityCreateInput = {
      id: `${id}`,
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
      user: {
        connect: {
          id: userId,
        },
      },
    };

    if (timezoneIdentifier) {
      createActivityPayload.timezone = timezoneIdentifier;
    }

    const activity = await this.prisma.activity.create({
      data: createActivityPayload,
    });

    // Add Challenge Activity //
    await this.activityTaskQueue.add('import', {
      userId,
      activity,
      splits_metric,
    });

    const owner = await this.userService.findOne(userId);

    if (owner) {
      const pace = moving_time / (distance / 1000);
      const movingTimeFormat = this.getMovingTimeFormatted(moving_time);
      const paceFormat = this.getAvgPace(distance, moving_time);
      await this.sendMessage({
        message: `New Activity from ${owner.name}\n${name}\n- Distance: ${(distance / 1000).toFixed(2)}km\n- Moving time: ${movingTimeFormat}\n- Pace: ${paceFormat} \n ${process.env.STRAVA_REDIRECT_URL}/${id}`,
      });
    }


    return activity;
  }

  async importActivityStatistic(data) {
    const { userId, activity, splits_metric } = data;
    if (!activity) {
      return;
    }

    await this.dailyActivityService.updateWebhookEvent(activity);

    const { id, distance, movingTime, elapsedTime, startDateLocal, timezone } =
      activity;

    let activityMinPace = activity.averageSpeed / 1000;

    let activityMaxPace = activity.averageSpeed / 1000;

    if (splits_metric) {
      activityMinPace = splits_metric[0].moving_time / (splits_metric[0].distance / 1000);
      activityMaxPace = splits_metric[0].moving_time / (splits_metric[0].distance / 1000);
      splits_metric.forEach((element) => {
        const { distance, moving_time } = element;
        if (distance < 100) {
          return;
        }

        const pace = moving_time / (distance / 1000);
        activityMinPace = Math.min(activityMinPace, pace);
        activityMaxPace = Math.max(activityMaxPace, pace);
      });
    }

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

    const [first, second] = getDateRange(
      `${startDateLocal}`,
      timezone,
      DateRangeType.DAY,
    );
    const dailyChallengeActivities =
      await this.prisma.challengeDailyActivity.findMany({
        where: {
          userId,
          startDateLocal: {
            gte: first,
            lte: second,
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
          startDateLocal: first,
          userId,
          challengeId,
        };
      });
      return this.prisma.challengeDailyActivity.createMany({
        data: challengeDailyActivityPayload,
      });
    }
    console.log('exist case', dailyChallengeActivities);
    const updateChallengeDailyActivityPayload = dailyChallengeActivities.map(
      (item, index) => {
        const challenge = challengeActivities[index];
        const isValidChallenge = challenge.isValid;
        const { challengeId, userId, id } = item;
        return {
          id,
          distance: isValidChallenge ? distance + item.distance : item.distance,
          movingTime: isValidChallenge
            ? movingTime + item.movingTime
            : item.movingTime,
          elapsedTime: isValidChallenge
            ? elapsedTime + item.elapsedTime
            : item.elapsedTime,
          challengeId,
          userId,
        };
      },
    );

    return updateChallengeDailyActivityPayload.map(async (item) => {
      const updatedChallengeDailyActivity =
        await this.prisma.challengeDailyActivity.updateMany({
          data: item,
          where: {
            id: item.id,
          },
        });
      return updatedChallengeDailyActivity;
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
    await this.dailyActivityService.manualCreateMany(payload);
    return activities;
  }

  async manualImportActivity(manualImportActivityDto: ManualImportActivityDto) {
    const { stravaId, activityId } = manualImportActivityDto;

    const owner = await this.userService.findByStravaId(stravaId);

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

    return this.createActivity(owner.id, foundedActivity);
  }

  async deleteOne(stravaId: number, activityId: string) {
    const owner = await this.userService.findByStravaId(stravaId);

    if (!owner) {
      throw new ForbiddenException('Not Found Owner!');
    }

    const activity = await this.prisma.activity.findUnique({
      where: {
        id: activityId,
      },
    });

    if (!activity) {
      throw new ForbiddenException('Not Found Activity!');
    }

    await this.prisma.activity.delete({
      where: {
        id: activityId,
      },
    });

    await this.updateDailyActivityAfterDeleteActivity(activity, owner.id);
    await this.updateChallengeDailyActivityAfterDeleteActivity(
      activity,
      owner.id,
    );

    return { success: true };
  }

  private async updateDailyActivityAfterDeleteActivity(
    activity: Activity,
    userId: number,
  ) {
    const { distance, movingTime, elapsedTime, startDateLocal, timezone } =
      activity;

    const [first, second] = getDateRange(
      `${startDateLocal}`,
      timezone,
      DateRangeType.DAY,
      'ddd MMM DD YYYY HH:mm:ss [GMT]Z',
    );
    const dailyActivity = await this.prisma.dailyActivity.findFirst({
      where: {
        userId,
        startDateLocal: {
          gte: first,
          lte: second,
        },
      },
    });

    const newDailyDistance = dailyActivity.distance - distance;
    const newDailyMovingTime = dailyActivity.movingTime - movingTime;
    const newDailyElapsedTime = dailyActivity.elapsedTime - elapsedTime;

    if (!newDailyDistance || !newDailyMovingTime || !newDailyElapsedTime) {
      return this.prisma.dailyActivity.deleteMany({
        where: {
          userId,
          startDateLocal: {
            gte: first,
            lte: second,
          },
        },
      });
    }
    const payload = {
      ...dailyActivity,
      movingTime: newDailyMovingTime,
      distance: newDailyDistance,
      elapsedTime: newDailyElapsedTime,
    };
    return this.prisma.dailyActivity.update({
      data: payload,
      where: {
        id: payload.id,
      },
    });
  }

  private async updateChallengeDailyActivityAfterDeleteActivity(
    activity: Activity,
    userId: number,
  ) {
    const { distance, movingTime, elapsedTime, startDateLocal, timezone } =
      activity;

    const [first, second] = getDateRange(
      `${startDateLocal}`,
      timezone,
      DateRangeType.DAY,
      'ddd MMM DD YYYY HH:mm:ss [GMT]Z',
    );
    const challengeActivities =
      await this.prisma.challengeDailyActivity.findMany({
        where: {
          userId,
          startDateLocal: {
            gte: first,
            lte: second,
          },
        },
      });

    if (!challengeActivities?.length) {
      return [];
    }

    const payload = challengeActivities.map((ac) => {
      const newDistance = ac.distance - distance;
      const newMovingTime = ac.movingTime - movingTime;
      const newElapsedTime = ac.elapsedTime - elapsedTime;
      return {
        ...ac,
        distance: newDistance,
        movingTime: newMovingTime,
        elapsedTime: newElapsedTime,
      };
    });
    return Promise.all(
      payload.map(async (item) => {
        return this.prisma.challengeDailyActivity.update({
          data: item,
          where: { id: item.id },
        });
      }),
    );
  }

  async manualCreateActivity(userId: number, manualCreateActivityDto: ManualCreateActivityDto) {
    const { distance, startDate, movingTime, imageUrl } = manualCreateActivityDto;
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    const id = uuidv4();
    const createActivityPayload: Prisma.ActivityUncheckedCreateInput = {
      distance,
      userId,
      id,
      activityType: ActivityType.MANUAL,
    };
    if (movingTime) {
      const [hour, minute, second] = movingTime.split(':');
      const hourToMinute = Number(hour) * 60 + minute;
      const paceToSecond = Number(hourToMinute) * 60 + Number(second);
      createActivityPayload.movingTime = paceToSecond;
      createActivityPayload.averageSpeed = (paceToSecond * 1000) / distance;
    }

    if (imageUrl) {
      createActivityPayload.imageUrl = imageUrl;
    }

    let createDate = new Date();

    if (startDate) {
      createDate = new Date(startDate);
    }
    const activityName = `${user.name} - ${createDate.getTime()}`;
    createActivityPayload.startDate = createDate;
    createActivityPayload.startDateLocal = createDate;
    createActivityPayload.name = activityName;

    const activity = await this.prisma.activity.create({
      data: createActivityPayload,
    });

    await this.activityTaskQueue.add('import', {
      userId,
      activity,
    });

    return activity;
  }

  async sendMessage(data: SendNotificationDto) {
    await this.notificationTaskQueue.add(NotificationJobs.sendTelegram, data);
    return { success: true };
  }

  getMovingTimeFormatted(movingTime: number) {
    if (!movingTime) {
      return '00:00:00';
    }
    let hour = 0;
    let minute = '00';
    let second = '00';
    hour = Math.floor(movingTime / 3600);
    const remainingSecondAfterHour = movingTime % 3600;
    const remainingMinute = Math.floor(remainingSecondAfterHour / 60);
    const remainingSecond = remainingSecondAfterHour % 60;

    minute = remainingMinute > 9 ? `${remainingMinute}` : `0${remainingMinute}`;
    second = remainingSecond > 9 ? `${remainingSecond}` : `0${remainingSecond}`;
    return `${hour}:${minute}:${second}`;
  }

  getAvgPace(distance: number, movingTime: number) {
    if (!movingTime) {
      return '00:00';
    }
    const paceTime = movingTime / (distance / 1000) / 60;
    const minute = Math.floor(paceTime);
    const second = ((paceTime % 1) * 60).toFixed(0);

    return `${minute}:${+second > 9 ? second : '0' + second}`;
  }

}
