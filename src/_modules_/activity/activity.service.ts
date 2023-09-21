import { catchError, firstValueFrom } from 'rxjs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async create(createActivityDto) {
    const { object_type, object_id, aspect_type, owner_id, event_time } =
      createActivityDto;
    if (object_type !== 'activity') {
      return;
    }
    const { refreshToken } = await this.prisma.user.findUnique({
      where: {
        stravaId: owner_id,
      },
    });
    const url = `${process.env.STRAVA_BASE_URL}/oauth/token`;
    const { data } = await firstValueFrom(
      this.httpService
        .post(
          url,
          {},
          {
            params: {
              client_id: process.env.STRAVA_CLIENT_ID,
              client_secret: process.env.STRAVA_CLIENT_SECRET,
              grant_type: `refresh_token`,
              refresh_token: refreshToken,
            },
          },
        )
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error.response.data);
            throw 'An error happened!';
          }),
        ),
    );

    const { access_token } = data;
    const activityUrl = `/activities/${object_id}`;

    const activityResponse = await firstValueFrom(
      this.httpService
        .get(activityUrl, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error.response.data);
            throw 'An error happened!';
          }),
        ),
    );

    const { id, distance, moving_time, name } = activityResponse.data;
    const activity = await this.prisma.temp.create({
      data: {
        activityId: id,
        distance,
        movingTime: moving_time,
        name,
      },
    });
    return activity
  }
}
