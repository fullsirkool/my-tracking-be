import { catchError, firstValueFrom } from 'rxjs';
import { UserService } from './../user/user.service';
import { PrismaService } from './../prisma/prisma.service';
import {
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { AuthDto, SignInAdminDto } from './auth.dto';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { AdminService } from '../admin/admin.service';
import * as bcrypt from 'bcrypt';
import {Claims, UserClaims} from 'src/types/auth.types';
import { JwtService } from '@nestjs/jwt';
import { exclude } from 'src/utils/transform.utils';
import { ActivityService } from '../activity/activity.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly httpService: HttpService,
    private readonly adminService: AdminService,
    @Inject(forwardRef(() => ActivityService))
    private readonly activityService: ActivityService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(code: string): Promise<AuthDto> {
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
    const { refresh_token, access_token } = data;
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
      stravaRefreshToken: refresh_token,
    };
    const findUser = await this.userService.findByStravaId(id);
    if (findUser) {
      const changeTokenDto = {
        stravaRefreshToken: refresh_token,
      };
      const user = await this.userService.changeToken(id, changeTokenDto);
      const { accessToken, refreshToken } = await this.generateTokens(user);
      console.log('user before change', user)
      return {
        user,
        accessToken,
        refreshToken,
        expireTime: +process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
      };
    }

    const user = await this.userService.create(sendUser);
    await this.activityService.createMany({
      user,
      access_token,
    });
    const { accessToken, refreshToken } = await this.generateTokens(user);
    console.log('user before change', user)
    return {
      user,
      accessToken,
      refreshToken,
      expireTime: +process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
    };
  }

  async resetToken(stravaRefreshToken: string) {
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
              refresh_token: stravaRefreshToken,
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

    return data;
  }

  async validateAdmin(signInAdminDto: SignInAdminDto) {
    const { username, password } = signInAdminDto;
    const admin = await this.adminService.findByUsername(username);
    if (!admin) {
      throw new UnauthorizedException('Admin not found!');
    }

    const isMatchPassword = await bcrypt.compare(password, admin.password);

    if (!isMatchPassword) {
      throw new UnauthorizedException('Wrong email or password!');
    }

    return admin;
  }

  async signInAdmin(claims: Claims) {
    const [tokens, admin] = await Promise.all([
      this.generateAdminTokens(claims),
      this.prisma.admin.findUnique({
        where: { id: claims.id },
      }),
    ]);
    return {
      ...tokens,
      admin: exclude(admin, ['password', 'refreshToken']),
    };
  }

  async renewToken(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (refreshToken !== user.refreshToken) {
      throw new UnauthorizedException();
    }

    const tokens = await this.generateTokens(user);
    return tokens;
  }

  private async generateAdminTokens(claims: Claims) {
    const accessToken = this.jwtService.sign(claims, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
      secret: process.env.ACCESS_TOKEN_SECRET,
    });

    const refreshToken = this.jwtService.sign(
      { sub: claims.id },
      {
        expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
        secret: process.env.REFRESH_TOKEN_SECRET,
      },
    );

    await this.prisma.admin.update({
      where: { id: claims.id },
      data: {
        refreshToken,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateTokens(user: User) {
    const { id, stravaId, firstName, lastName, profile, refreshToken } = user;
    const accessToken = this.jwtService.sign(
      { id, stravaId, firstName, lastName, profile },
      {
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
        secret: process.env.ACCESS_TOKEN_SECRET,
      },
    );

    if (!refreshToken) {
      const newRefreshToken = this.jwtService.sign(
        { sub: id },
        {
          expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
          secret: process.env.REFRESH_TOKEN_SECRET,
        },
      );

      await this.prisma.user.update({
        where: { id: id },
        data: {
          refreshToken: newRefreshToken,
        },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  getSelfInfo(claims: UserClaims) {
    return {}
  }
}
