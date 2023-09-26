import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './admin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAdminDto: CreateAdminDto) {
    const { username, password } = createAdminDto;

    const saltOrRounds = +process.env.BCRYPT_SALT;
    const hash = await bcrypt.hash(password, saltOrRounds);
    return await this.prisma.admin.create({
      data: {
        username,
        password: hash,
      },
    });
  }

  async findByUsername(username: string) {
    return await this.prisma.admin.findUnique({ where: { username } });
  }
}
