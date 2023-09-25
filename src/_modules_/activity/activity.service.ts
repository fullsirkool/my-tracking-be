import { catchError, firstValueFrom } from 'rxjs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
  ) {}

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

    const { refreshToken } = owner;

    const tokenRes = await this.authService.resetToken(refreshToken);

    const { access_token } = tokenRes;

    const foundedActivity = await this.findStravaActivity(
      object_id,
      access_token,
    );

    const res = await this.createActivity(foundedActivity);

    return res;
  }

  async createActivity(activityDto) {
    const {
      id,
      athlete,
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
    const userId = athlete.id;
    let isValid = true;
    if (type !== 'Run') {
      isValid = false;
    }

    const invalidSplitMetric = splits_metric.find(item => {
      const {distance, moving_time} = item
      const pace = (moving_time / (distance / 1000)) / 60
      if (pace > 15 || pace < 4) {
        return true
      }
    })

    if (invalidSplitMetric) {
      isValid = false;
    }

    const activity = await this.prisma.activity.create({
      data: {
        id,
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
        splitMetrics: splits_metric,
        isValid,
      },
    });
    return activity;
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
    return await this.prisma.temp.findUnique({
      where: {
        activityId: `${id}`,
      },
    });
  }
}
