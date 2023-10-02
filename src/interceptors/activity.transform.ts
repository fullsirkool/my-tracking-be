import { Activity } from '@prisma/client';

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ShortActivity } from 'src/_modules_/activity/activity.dto';

@Injectable()
export class ActivityTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (!data) {
          return [];
        }
        return data.map((activity: Activity) => ({
          id: activity.id,
          distance: activity.distance,
          startDate: activity.startDate,
          type: activity.type,
          isValid: activity.isValid,
        })) as ShortActivity[];
      }),
    );
  }
}
