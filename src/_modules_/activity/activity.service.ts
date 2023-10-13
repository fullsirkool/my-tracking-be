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
} from './activity.dto';

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

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
    const res = await this.prisma.$queryRaw`
      SELECT DATE_TRUNC('day', start_date) as startDate, SUM(distance) as distance
      FROM activity
      WHERE start_date >= ${start} AND start_date <= ${end} AND user_id = ${id}
      GROUP BY DATE_TRUNC('day', start_date)
    `;
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

    const distance = _sum.distance;
    const totalMovingTime = _sum.movingTime;
    const count = _count.id;

    const pace = totalMovingTime / (distance / 1000) / 60;
    return {
      distance,
      pace,
      count,
    };
  }

  async getWebhookResponse(createActivityDto) {
    const { object_type, object_id, owner_id, aspect_type } = createActivityDto;

    if (object_type !== 'activity' || aspect_type !== 'create') {
      return;
    }

    const createdActivity = await this.findOneByActivityId(object_id);

    if (createdActivity) {
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

    const foundedActivity = await this.findOneByActivityId(id);

    if (foundedActivity) {
      throw new ConflictException('Activity already exists!');
    }

    let isValid = type === 'Run';
    if (distance < 1000) {
      isValid = false;
    }

    const invalidSplitMetric = splits_metric.find((item) => {
      const { distance, moving_time } = item;
      if (distance < 100) {
        return false;
      }
      const pace = moving_time / (distance / 1000) / 60;
      if (pace > 15 || pace < 4) {
        return true;
      }
    });

    if (invalidSplitMetric) {
      isValid = false;
    }

    console.log('valid', isValid);

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
        isValid,
      },
    });
    return activity;
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
        isValid: true,
      };
    });
    console.log('payload', payload);
    const activities = await this.prisma.activity.createMany({
      data: payload,
    });
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
