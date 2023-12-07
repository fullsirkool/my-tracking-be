import {PrismaService} from './../prisma/prisma.service';
import {BadRequestException, Injectable} from '@nestjs/common';
import {CreateUserDto} from './user.dto';
import {User} from '@prisma/client';
import {ChangeTokenDto} from '../auth/auth.dto';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {
    }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const user = await this.prisma.user.create({
            data: createUserDto,
        });
        return user;
    }

    async findByStravaId(stravaId: number): Promise<User> {
        if (!stravaId) {
            throw new BadRequestException('stravaId is error!');
        }
        const findUser = await this.prisma.user.findFirst({
            where: {stravaId},
        });

        return findUser;
    }

    async changeToken(
        stravaId: number,
        changeTokenDto: ChangeTokenDto,
    ): Promise<User> {
        const {stravaRefreshToken} = changeTokenDto;
        const findUser = await this.findByStravaId(stravaId)
        const user = await this.prisma.user.update({
            where: {id: findUser.id},
            data: {stravaRefreshToken},
        });
        return user;
    }
}
