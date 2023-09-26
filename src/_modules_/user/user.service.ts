import { PrismaService } from './../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './user.dto';
import { User } from '@prisma/client';
import { ChangeTokenDto } from '../auth/auth.dto';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.prismaService.user.create({
      data: createUserDto,
    });
    return user;
  }

  async findByStravaId(stravaId: number): Promise<User> {
    const findUser = await this.prismaService.user.findUnique({
      where: { stravaId },
    });
    return findUser;
  }

  async changeToken(
    stravaId: number,
    changeTokenDto: ChangeTokenDto,
  ): Promise<User> {
    const { accessToken, accessTokenExpireTime, refreshToken } = changeTokenDto;
    const user = await this.prismaService.user.update({
      where: { stravaId },
      data: { accessToken, accessTokenExpireTime, refreshToken },
    });
    return user;
  }
}
