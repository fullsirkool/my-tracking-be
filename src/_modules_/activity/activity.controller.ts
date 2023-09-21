import { Controller, Post, Body } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('/event')
  createActivity(@Body() data) {
    return this.activityService.create(data);
  }
}
