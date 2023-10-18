import {
  applyDecorators,
  CanActivate,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/role.guard';
import { AuthRole } from 'src/types/auth.types';

export function Auth(
  role: AuthRole = 'ALL',
  /* eslint-disable-next-line */
  ...AnyGuardElse: Array<Function | CanActivate>
) {
  return applyDecorators(
    SetMetadata('role', role),
    UseGuards(JwtAuthGuard, RolesGuard, ...AnyGuardElse),
    ApiBearerAuth(),
  );
}
