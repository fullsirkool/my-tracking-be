import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtRefreshAdminStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-admin',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: process.env.A_REFRESH_TOKEN_SECRET,
    });
  }

  async validate(payload: { sub: number }) {
    return {
      id: payload.sub,
    };
  }
}
