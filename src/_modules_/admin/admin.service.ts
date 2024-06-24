import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './admin.dto';
import * as bcrypt from 'bcrypt';
import { SignInAdminDto } from '../auth/auth.dto';
import { Claims } from '../../types/auth.types';
import { destructExpiredDateToken, exclude } from '../../utils/transform.utils';
import * as moment from 'moment-timezone';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async create(createAdminDto: CreateAdminDto) {
    const { username, password } = createAdminDto;

    const saltOrRounds = +process.env.BCRYPT_SALT;
    const hash = await bcrypt.hash(password, saltOrRounds);
    return this.prisma.admin.create({
      data: {
        username,
        password: hash,
      },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.admin.findUnique({ where: { username } });
  }

  async validateAdmin(signInAdminDto: SignInAdminDto) {
    const { username, password } = signInAdminDto;
    const admin = await this.findByUsername(username);
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
      admin: exclude(admin, ['password']),
    };
  }

  private async generateAdminTokens(claims: Claims) {
    const { id } = claims;
    const accessToken = this.jwtService.sign(claims, {
      expiresIn: process.env.A_JWT_ACCESS_TOKEN_EXPIRATION_TIME,
      secret: process.env.A_ACCESS_TOKEN_SECRET,
    });

    const refreshToken = this.jwtService.sign(
      { sub: id },
      {
        expiresIn: process.env.A_JWT_REFRESH_TOKEN_EXPIRATION_TIME,
        secret: process.env.A_REFRESH_TOKEN_SECRET,
      },
    );

    const { number, range } = destructExpiredDateToken(
      process.env.A_JWT_REFRESH_TOKEN_EXPIRATION_TIME,
    );

    const expiredDate = moment
      .tz('Asia/Ho_Chi_Minh')
      .add(number, range)
      .toDate();

    await this.prisma.adminToken.create({
      data: {
        adminId: id,
        refreshToken,
        expiredDate,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async renewAdminToken(adminId: number, refreshToken: string) {
    const admin = await this.prisma.admin.findUnique({
      where: {
        id: adminId,
      },
      include: {
        adminTokens: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Not found user!');
    }

    const foundToken = admin.adminTokens.find(
      (item) => item.refreshToken === refreshToken,
    );

    if (!foundToken) {
      throw new UnauthorizedException('Not found token');
    }
    const isValidToken = moment()
      .tz('Asia/Ho_Chi_Minh')
      .isSameOrBefore(foundToken.expiredDate);
    if (!isValidToken) {
      await this.prisma.adminToken.delete({
        where: {
          id: foundToken.id,
        },
      });
      throw new UnauthorizedException('Token expired!');
    }

    return this.generateAdminTokens(admin);
  }

  async getSelfInfo(adminId: number) {
    const admin = await this.prisma.admin.findUnique({
      where: {
        id: adminId,
      },
    });

    if (!admin) {
      throw new NotFoundException('Not found user!');
    }
    return admin;
  }
}
