import {
  Body,
  Controller,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { SignInAdminDto } from './auth.dto';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { Claims } from 'src/types/auth.types';
import { User } from 'src/decorators/user.decorator';
import { ApiBody, ApiTags } from '@nestjs/swagger';

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
  async login(@User() claims: Claims) {
    return this.authService.signInAdmin(claims);
  }
}
