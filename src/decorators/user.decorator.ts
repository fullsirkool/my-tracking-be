import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserClaims } from 'src/types/auth.types';

export const User = createParamDecorator(
  (data: keyof UserClaims, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
