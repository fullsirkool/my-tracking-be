import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { response } from 'express';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('/event')
  createActivity(@Body() data) {
    return this.activityService.create(data);
  }

  @Get('/verify')
  verify(@Query() params) {
    const mode = params['hub.mode'];
    const hub_challenge = params['hub.challenge'];
    const verify_token = params['hub.verify_token'];
    if (mode && verify_token) {
      // Verifies that the mode and token sent are valid
      if (mode === 'subscribe' && verify_token === process.env.VERIFY_TOKEN) {
        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        return { 'hub.challenge': hub_challenge };
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        response.sendStatus(403);
      }
    }
  }
}
