import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class AuthTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (!data) {
          return {};
        }
        const { user } = data;
        const { id, stravaId, firstName, lastName, profile, email, activated } = user;
        return {
          ...data,
          user: { id, stravaId, firstName, lastName, profile, email, activated },
        };
      }),
    );
  }
}
