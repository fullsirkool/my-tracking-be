import { CreateAdminDto } from './admin.dto';
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { LocalAuthGuard } from '../../guards/local-auth.guard';
import { RenewDto, SignInAdminDto } from '../auth/auth.dto';
import { Admin } from '../../decorators/admin.decorator';
import { Claims } from '../../types/auth.types';
import { JwtRefreshAdminAuthGuard } from '../../guards/jwt-refresh-admin.guard';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Auth } from '../../decorators/auth.decorator';
import { AdminTransformInterceptor } from '../../interceptors/admin.transform';
import { JwtAdminAuthGuard } from '../../guards/jwt-admin-auth.guard';

@Controller('/auth/admin')
@ApiTags('/auth/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('')
  @ApiBody({ type: CreateAdminDto })
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  async create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @UseGuards(LocalAuthGuard)
  @ApiBody({ type: SignInAdminDto })
  @Post('/sign-in')
  async login(@Admin() claims: Claims) {
    return this.adminService.signInAdmin(claims);
  }

  @Post('/renew')
  @ApiBody({ type: RenewDto })
  @UseGuards(JwtRefreshAdminAuthGuard)
  @ApiBearerAuth()
  async refreshToken(
    @Admin('id') adminId: number,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.adminService.renewAdminToken(adminId, refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthGuard)
  @Get('/self')
  @UseInterceptors(AdminTransformInterceptor)
  async getSelfInfo(@Admin('id') adminId: number) {
    return this.adminService.getSelfInfo(adminId);
  }
}
