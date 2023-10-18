import {
  Controller,
  Param,
  Post,
  UseGuards,
  Get,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RenewDto, SignInAdminDto } from './auth.dto';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { Claims, UserClaims } from 'src/types/auth.types';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Admin } from 'src/decorators/admin.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { User } from 'src/decorators/user.decorator';
import { AuthTransformInterceptor } from 'src/interceptors/auth.transform';
import { JwtRefreshAuthGuard } from 'src/guards/jwt-refresh.guard';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signin/:code')
  @UseInterceptors(AuthTransformInterceptor)
  async signin(@Param('code') code: string) {
    const signInResponse = await this.authService.signIn(code);
    return signInResponse;
  }

  @UseGuards(LocalAuthGuard)
  @ApiBody({ type: SignInAdminDto })
  @Post('/admin/sign-in')
  async login(@Admin() claims: Claims) {
    return this.authService.signInAdmin(claims);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/self')
  async getSelfInfo(@User() claims: UserClaims) {
    console.log('claims', claims);
    return this.authService.getSelfInfo(claims);
  }

  @Post('/renew')
  @ApiBody({ type: RenewDto })
  @UseGuards(JwtRefreshAuthGuard)
  async refreshToken(
    @User('id') userId: number,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.authService.renewToken(userId, refreshToken);
  }
}
