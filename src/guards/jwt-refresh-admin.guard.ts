import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshAdminAuthGuard extends AuthGuard('jwt-refresh-admin') {}
