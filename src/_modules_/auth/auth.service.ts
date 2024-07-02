import { catchError, firstValueFrom } from 'rxjs';
import { UserService } from './../user/user.service';
import { PrismaService } from './../prisma/prisma.service';
import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CompleteUserDto,
  SignInDto,
  SignInGoogleDto,
  SignUpDto,
} from './auth.dto';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { AdminService } from '../admin/admin.service';
import * as bcrypt from 'bcrypt';
import { UserClaims } from 'src/types/auth.types';
import { JwtService } from '@nestjs/jwt';
import { destructExpiredDateToken } from 'src/utils/transform.utils';
import { ActivityService } from '../activity/activity.service';
import { User } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import * as process from 'process';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { FirebaseService } from '../firebase/firebase.service';
import * as moment from 'moment-timezone';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly httpService: HttpService,
    private readonly adminService: AdminService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => ActivityService))
    private readonly activityService: ActivityService,
    private readonly jwtService: JwtService,
    @InjectQueue('auth') private readonly authTaskQueue: Queue,
    @InjectQueue('activity') private readonly activityTaskQueue: Queue,
    private readonly firebaseService: FirebaseService,
  ) {}

  async connectStrava(code: string, userId: number) {
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
    const { id, profile } = data.athlete;

    const connectedUser = await this.userService.findByStravaId(id);

    if (connectedUser) {
      throw new ConflictException(
        `This strava account has already connected. Please check again!`,
      );
    }

    const sendUser = {
      stravaId: id,
      profile,
      stravaRefreshToken: refresh_token,
    };
    const findUser = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!findUser) {
      throw new NotFoundException('Not Found User!');
    }

    await this.prisma.user.update({
      where: { id: findUser.id },
      data: sendUser,
    });

    // await this.activityTaskQueue.add('import-first', {
    //   access_token,
    //   findUser,
    // });

    return { success: true };
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

  async renewToken(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        userTokens: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Not found user!');
    }

    const foundToken = user.userTokens.find(
      (item) => item.refreshToken === refreshToken,
    );

    if (!foundToken) {
      throw new UnauthorizedException('Not found token');
    }
    const isValidToken = moment()
      .tz('Asia/Bangkok')
      .isSameOrBefore(foundToken.expiredDate);
    if (!isValidToken) {
      await this.prisma.userToken.delete({
        where: {
          id: foundToken.id,
        },
      });
      throw new UnauthorizedException('Token expired!');
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: User) {
    const { id, stravaId, profile } = user;
    const accessToken = this.jwtService.sign(
      { id, stravaId, profile },
      {
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
        secret: process.env.ACCESS_TOKEN_SECRET,
      },
    );

    const newRefreshToken = this.jwtService.sign(
      { sub: id },
      {
        expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
        secret: process.env.REFRESH_TOKEN_SECRET,
      },
    );

    const { number, range } = destructExpiredDateToken(
      process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
    );

    const expiredDate = moment
      .tz('Asia/Bangkok')
      .add(number, range)
      .toDate();

    await this.prisma.userToken.create({
      data: {
        refreshToken: newRefreshToken,
        userId: id,
        expiredDate: expiredDate,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async getSelfInfo(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('Not found user!');
    }
    return user;
  }

  async complete(userId: number, completeUserDto: CompleteUserDto) {
    const { email, password } = completeUserDto;

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new NotFoundException('Not Found User!');
    }

    if (user.email && user.password) {
      throw new ConflictException('User has been completed!');
    }

    const saltOrRounds = +process.env.USER_SALT;
    const hash = await bcrypt.hash(password, saltOrRounds);

    return this.prisma.user.update({
      data: {
        email,
        password: hash,
      },
      where: {
        id: userId,
      },
    });
  }

  async create(signUpDto: SignUpDto) {
    const { email, password, name, sex } = signUpDto;
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      throw new ConflictException('Email has registered!');
    }

    const saltOrRounds = +process.env.USER_SALT;
    const hash = await bcrypt.hash(password, saltOrRounds);

    const createdUser = await this.prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        sex,
      },
    });

    return { success: true };
  }

  async verify(capcha: string) {
    const findUser = await this.prisma.user.findFirst({
      where: { capcha },
    });
    if (!findUser) {
      throw new NotFoundException('Could not find account with capcha!');
    }
    return this.prisma.user.update({
      where: { id: findUser.id },
      data: {
        capcha: null,
        activated: true,
      },
    });
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Not found user!');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Email or password is incorrect!');
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);
    return {
      user,
      accessToken,
      refreshToken,
      expireTime: +process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
    };
  }

  async resendEmail(signInDto: SignInDto) {
    const { email, password } = signInDto;
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Not found user!');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Email or password is incorrect!');
    }

    const { capcha } = user;

    const url = `${process.env.APP_URL}/confirm/${capcha}`;
    await this.mailService.confirmAccount({
      to: email,
      url,
      subject: 'Welcome To My Tracking',
    });
    return { success: true };
  }

  async signInGoogle(signInGoogleDto: SignInGoogleDto) {
    const { token } = signInGoogleDto;
    const firebaseAuth = this.firebaseService.getFirebaseApp().auth();
    const decodedToken = await firebaseAuth.verifyIdToken(token);

    if (!decodedToken) {
      throw new NotAcceptableException('Failed!');
    }

    const { email, uid } = decodedToken;

    const userProfile = await firebaseAuth.getUser(uid);

    const { displayName, photoURL } = userProfile;

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: displayName,
          profile: photoURL,
          activated: true,
        },
      });
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
}
