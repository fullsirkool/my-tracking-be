import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { response } from 'express';
import {
  DeleteActivityDto,
  FindActivityDto,
  FindMonthlyActivityDto,
  ManualCreateActivityDto,
  ManualImportActivityDto, SendNotificationDto,
} from './activity.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Auth } from '../../decorators/auth.decorator';
import { User } from '../../decorators/user.decorator';

@Controller('activity')
@ApiTags('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {
  }

  @Post('/event')
  createActivity(@Body() data) {
    return this.activityService.getWebhookResponse(data);
  }

  @Post()
  async manualCreate(@Body() manualImportActivityDto: ManualImportActivityDto) {
    return await this.activityService.manualImportActivity(
      manualImportActivityDto,
    );
  }

  @Post('/manual')
  @UseGuards(JwtAuthGuard)
  @Auth()
  async manualCreateActivity(@User('id') userId: number, @Body() manualCreateActivityDto: ManualCreateActivityDto) {
    return this.activityService.manualCreateActivity(userId, manualCreateActivityDto);
  }

  @Get('/event')
  verify(@Query() params) {
    const mode = params['hub.mode'];
    const hub_challenge = params['hub.challenge'];
    const verify_token = params['hub.verify_token'];
    console.log('get event', mode, hub_challenge, verify_token);
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

  @Get('/monthly')
  // @UseInterceptors(ActivityTransformInterceptor)
  async findMonthlyActivity(
    @Query() findMonthlyActivityDto: FindMonthlyActivityDto,
  ) {
    return this.activityService.findMonthlyActivity(findMonthlyActivityDto);
  }

  @Get('/statistics/:id')
  async findStatistics(@Param('id') id: number) {
    return await this.activityService.getTotalStatistics(+id);
  }

  @Get()
  async find(@Query() findActivityDto: FindActivityDto) {
    return this.activityService.find(findActivityDto);
  }

  @Delete('/:id')
  async deleteOne(
    @Param('id') id: string,
    @Body() deleteActivityDto: DeleteActivityDto,
  ) {
    const { stravaId } = deleteActivityDto;
    return this.activityService.deleteOne(stravaId, id);
  }

  @Post('/send-message')
  async sendMessage(@Body() data: SendNotificationDto) {
    return this.activityService.sendMessage(data);
  }

}
