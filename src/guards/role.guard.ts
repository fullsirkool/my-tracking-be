import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRole, UserClaims } from 'src/types/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const role = this.reflector.get<AuthRole>('role', context.getHandler());
    const request = context.switchToHttp().getRequest();

    const user: UserClaims = request.user;

    if (role === 'ALL') return true;

    if (user) return true;

    return false;
  }
}
