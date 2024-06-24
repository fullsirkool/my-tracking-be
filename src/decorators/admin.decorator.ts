import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Claims } from 'src/types/auth.types';

export const Admin = createParamDecorator(
  (data: keyof Claims, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const admin = request.user;
    return data ? admin?.[data] : admin;
  },
);
