import { catchError, firstValueFrom } from 'rxjs';
import { UserService } from './../user/user.service';
import { PrismaService } from './../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { AuthDto, ChangeTokenDto } from './auth.dto';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly httpService: HttpService,
  ) {}

  async signIn(code: string): Promise<AuthDto> {
    try {
      console.log(
        process.env.STRAVA_BASE_URL,
        code,
        process.env.STRAVA_CLIENT_ID,
        process.env.STRAVA_CLIENT_SECRET,
      );
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
                code: code,
                grant_type: `authorization_code`,
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
      console.log('response', data);
      const { token_type, access_token, expires_at, refresh_token } = data;
      const {
        id,
        firstname,
        lastname,
        bio,
        city,
        state,
        country,
        sex,
        profile_medium,
        profile,
      } = data.athlete;
      const sendUser = {
        stravaId: id,
        firstName: firstname,
        lastName: lastname,
        bio,
        city,
        state,
        country,
        sex,
        profileMedium: profile_medium,
        profile,
        tokenType: token_type,
        accessToken: access_token,
        accessTokenExpireTime: expires_at,
        refreshToken: refresh_token,
      };
      const findUser = await this.userService.findByStravaId(id);
      console.log('findUser', findUser);
      if (findUser) {
        const changeTokenDto = {
          accessToken: access_token,
          accessTokenExpireTime: expires_at,
          refreshToken: refresh_token,
        };
        const user = await this.userService.changeToken(id, changeTokenDto);
        return {
          token: user.accessToken,
          expireTime: user.accessTokenExpireTime,
        };
      } else {
        const user = await this.userService.create(sendUser);
        return {
          token: user.accessToken,
          expireTime: user.accessTokenExpireTime,
        };
      }
    } catch (error) {
      console.error(error);
    }
  }
}
