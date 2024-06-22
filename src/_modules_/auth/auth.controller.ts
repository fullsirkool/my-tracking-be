import {
  Controller,
  Param,
  Post,
  UseGuards,
  Get,
  UseInterceptors,
  Body,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CompleteUserDto,
  RenewDto,
  SignInAdminDto,
  SignInDto,
  SignInGoogleDto,
  SignUpDto,
} from './auth.dto';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { Claims, UserClaims } from 'src/types/auth.types';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Admin } from 'src/decorators/admin.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { User } from 'src/decorators/user.decorator';
import { AuthTransformInterceptor } from 'src/interceptors/auth.transform';
import { JwtRefreshAuthGuard } from 'src/guards/jwt-refresh.guard';
import { Auth } from '../../decorators/auth.decorator';
import { UserTransformInterceptor } from '../../interceptors/user.transform';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/connect/:code')
  @Auth()
  async connectStrava(@User('id') userId: number, @Param('code') code: string) {
    return this.authService.connectStrava(code, userId);
  }

  @Post('/signup')
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.create(signUpDto);
  }

  @ApiBody({ type: SignInDto })
  @Post('/sign-in')
  @UseInterceptors(AuthTransformInterceptor)
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
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

  @Patch('/complete')
  @ApiBody({ type: CompleteUserDto })
  @Auth()
  @UseInterceptors(UserTransformInterceptor)
  async complete(
    @User('id') userId: number,
    @Body() completeUserDto: CompleteUserDto,
  ) {
    return this.authService.complete(userId, completeUserDto);
  }

  @Patch('/verify/:capcha')
  @UseInterceptors(UserTransformInterceptor)
  async verify(@Param('capcha') capcha: string) {
    return this.authService.verify(capcha);
  }

  @ApiBody({ type: SignInDto })
  @Post('/resend-email')
  async resendEmail(@Body() signInDto: SignInDto) {
    return this.authService.resendEmail(signInDto);
  }

  @ApiBody({ type: SignInGoogleDto })
  @Post('/google/sign-in')
  async signInGoogle(@Body() signInGoogleDto: SignInGoogleDto) {
    return this.authService.signInGoogle(signInGoogleDto);
  }
}
