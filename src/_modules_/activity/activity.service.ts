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
    console.log('create activity', createActivityDto);
    if (object_type !== 'activity') {
      return;
    }

    const foundedActivity = await this.prisma.temp.findUnique({
      where: {
        activityId: `${object_id}`
      }
    })

    if (foundedActivity) {
      return
    }

    const owner = await this.prisma.user.findUnique({
      where: {
        stravaId: owner_id,
      },
    });

    console.log('owner', owner)

    if (!owner) {
      return;
    }

    const { refreshToken } = owner;
    const url = `${process.env.STRAVA_BASE_URL}/oauth/token`;
    const tokenRes = await firstValueFrom(
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
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    console.log('tokenRes', tokenRes.data)

    const { access_token } = tokenRes.data;

    const activityUrl = `${process.env.STRAVA_BASE_URL}/activities/${object_id}`;

    const activityResponse = await firstValueFrom(
      this.httpService
        .get(activityUrl, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    console.log('activityResponse', activityResponse.data);

    const { id, distance, moving_time, name } = activityResponse.data;
    const activity = await this.prisma.temp.create({
      data: {
        activityId: `${id}`,
        distance,
        movingTime: moving_time,
        name,
      },
    });
    return activity;
  }
}
