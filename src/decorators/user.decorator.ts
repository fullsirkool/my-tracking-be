import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Claims } from 'src/types/auth.types';

export const User = createParamDecorator(
  (data: keyof Claims, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  }
);
