import { Body, Controller, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller('auth')
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
}
