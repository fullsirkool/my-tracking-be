import {
  Body,
  Controller,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { SignInAdminDto } from './auth.dto';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { Claims, UserClaims } from 'src/types/auth.types';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Admin } from 'src/decorators/admin.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { User } from 'src/decorators/user.decorator';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signin/:code')
  async signin(
    @Param('code') code: string,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const signInResponse = await this.authService.signIn(code);
      return res.status(HttpStatus.OK).send(signInResponse);
    } catch (error) {
      console.log(error.message);
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .send({ message: error.message });
    }
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
    console.log('claims', claims)
    return this.authService.getSelfInfo(claims);
  }
}
