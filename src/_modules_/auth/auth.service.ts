import {catchError, firstValueFrom} from 'rxjs';
import {UserService} from './../user/user.service';
import {PrismaService} from './../prisma/prisma.service';
import {
    Inject,
    Injectable,
    UnauthorizedException,
    forwardRef,
    NotFoundException,
    ConflictException, NotAcceptableException,
} from '@nestjs/common';
import {
    AuthDto,
    CompleteUserDto,
    SignInAdminDto, SignInDto, SignInGoogleDto,
    SignUpDto,
} from './auth.dto';
import {HttpService} from '@nestjs/axios';
import {AxiosError} from 'axios';
import {AdminService} from '../admin/admin.service';
import * as bcrypt from 'bcrypt';
import {Claims, UserClaims} from 'src/types/auth.types';
import {JwtService} from '@nestjs/jwt';
import {exclude} from 'src/utils/transform.utils';
import {ActivityService} from '../activity/activity.service';
import {User} from '@prisma/client';
import {MailService} from "../mail/mail.service";
import * as process from "process";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {FirebaseService} from "../firebase/firebase.service";

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
        private readonly firebaseService: FirebaseService,
    ) {
    }

    async connectStrava(code: string, userId: number) {
        const url = `${process.env.STRAVA_BASE_URL}/oauth/token`;
        const {data} = await firstValueFrom(
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
        const {refresh_token} = data;
        const {
            id,
            firstname,
            lastname,
            profile,
        } = data.athlete;

        const connectedUser = await this.userService.findByStravaId(id)

        if (connectedUser) {
            throw new ConflictException(`This strava account has already connected. Please check again!`)
        }

        const sendUser = {
            stravaId: id,
            firstName: firstname,
            lastName: lastname,
            profile,
            stravaRefreshToken: refresh_token,
        };
        const findUser = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        })

        if (!findUser) {
            throw new NotFoundException('Not Found User!')
        }

        await this.prisma.user.update({
            where: {id: findUser.id},
            data: sendUser,
        });
        return {success: true};
    }

    async resetToken(stravaRefreshToken: string) {
        const url = `${process.env.STRAVA_BASE_URL}/oauth/token`;
        const {data} = await firstValueFrom(
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
        const {username, password} = signInAdminDto;
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
                where: {id: claims.id},
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
            {sub: claims.id},
            {
                expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
                secret: process.env.REFRESH_TOKEN_SECRET,
            },
        );

        await this.prisma.admin.update({
            where: {id: claims.id},
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
        const {id, stravaId, firstName, lastName, profile, refreshToken} = user;
        const accessToken = this.jwtService.sign(
            {id, stravaId, firstName, lastName, profile},
            {
                expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
                secret: process.env.ACCESS_TOKEN_SECRET,
            },
        );

        if (!refreshToken) {
            const newRefreshToken = this.jwtService.sign(
                {sub: id},
                {
                    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
                    secret: process.env.REFRESH_TOKEN_SECRET,
                },
            );

            await this.prisma.user.update({
                where: {id: id},
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
        return {};
    }

    async complete(userId: number, completeUserDto: CompleteUserDto) {
        const {email, password} = completeUserDto;

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
        const {email, password, firstName, lastName, sex} = signUpDto;
        const user = await this.prisma.user.findUnique({
            where: {email},
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
                firstName,
                lastName,
                sex
            }
        });

        const {capcha} = createdUser
        const url = `${process.env.APP_URL}/confirm/${capcha}`


        await this.authTaskQueue.add('send-mail', {
            email,
            url,
        });

        return {success: true}
    }

    async verify(capcha: string) {
        const findUser = await this.prisma.user.findFirst({
            where: {capcha},
        });
        if (!findUser) {
            throw new NotFoundException('Could not find account with capcha!');
        }
        return this.prisma.user.update({
            where: {id: findUser.id},
            data: {
                capcha: null,
                activated: true,
            },
        });
    }

    async signIn(signInDto: SignInDto) {
        const {email, password} = signInDto
        const user = await this.userService.findByEmail(email)
        if (!user) {
            throw new NotFoundException('Not found user!')
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            throw new UnauthorizedException('Email or password is incorrect!')
        }

        const {activated} = user

        if (!activated) {
            throw new UnauthorizedException('Your account has not verified. Please check your email to active your account!')
        }

        const {accessToken, refreshToken} = await this.generateTokens(user);
        return {
            user,
            accessToken,
            refreshToken,
            expireTime: +process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
        };
    }

    async resendEmail(signInDto: SignInDto) {
        const {email, password} = signInDto
        const user = await this.userService.findByEmail(email)
        if (!user) {
            throw new NotFoundException('Not found user!')
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            throw new UnauthorizedException('Email or password is incorrect!')
        }

        const {capcha} = user

        const url = `${process.env.APP_URL}/confirm/${capcha}`
        await this.mailService.confirmAccount({to: email, url, subject: 'Welcome To My Tracking'})
        return {success: true}
    }

    async signInGoogle(signInGoogleDto: SignInGoogleDto){
        const {token, deviceToken} = signInGoogleDto
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
                    firstName: displayName,
                    profile: photoURL,
                    activated: true,
                }
            })
        }

        const { accessToken, refreshToken } = await this.generateTokens(user);

        return {
            user,
            accessToken,
            refreshToken,
        };
    }
}
