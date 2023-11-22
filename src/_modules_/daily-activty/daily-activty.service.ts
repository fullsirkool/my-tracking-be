import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Activity } from '@prisma/client';

@Injectable()
export class DailyActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async updateWebhookEvent(activity: Activity) {
    if (!activity) {
      return;
    }
    const { distance, movingTime, elapsedTime, startDateLocal, userId } =
      activity;
    const findDate = new Date(startDateLocal);
    findDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(
      findDate.getFullYear(),
      findDate.getMonth(),
      findDate.getDate() + 1,
    );
    const dailyActivity = await this.prisma.dailyActivity.findFirst({
      where: {
        userId,
        startDateLocal: {
          gte: findDate,
          lte: nextDate,
        },
      },
    });

    if (!dailyActivity) {
      return this.prisma.dailyActivity.create({
        data: {
          distance,
          movingTime,
          elapsedTime,
          startDateLocal: findDate,
          userId,
        },
      });
    }

    return this.prisma.dailyActivity.update({
      data: {
        distance: distance + dailyActivity.distance,
        movingTime: movingTime + dailyActivity.movingTime,
        elapsedTime: elapsedTime + dailyActivity.elapsedTime,
      },
      where: {
        id: dailyActivity.id,
      },
    });
  }

  async manualCreateMany(activities) {
    const payload = activities.map((item) => ({
      userId: item.userId,
      distance: item.distance,
      movingTime: item.movingTime,
      elapsedTime: item.elapsedTime,
      startDateLocal: item.startDateLocal,
    }));
  }

  async getMonthlyActivity(userId: number, start: Date, end: Date) {
    return await this.prisma.dailyActivity.findMany({
      where: {
        userId,
        startDateLocal: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        startDateLocal: 'asc',
      },
    });
  }

  async transform(userId: number) {
    const activities = await this.prisma.activity.findMany({
      where: {
        userId,
      },
    });
    const transformedActivities =
      this.transformActivtyToDailyActivity(activities);
    return await this.prisma.dailyActivity.createMany({
      data: transformedActivities.map((item) => ({ ...item, userId })),
    });
  }

  //manual update by status(isValid)

  private transformActivtyToDailyActivity(activities) {
    const cloneActivties = activities.map((item) => {
      const clone = { ...item };
      const cloneDate = new Date(item.startDateLocal);
      cloneDate.setHours(12, 0, 0, 0);
      clone.startDateLocal = cloneDate;
      return clone;
    });

    const dailyActivities = [];

    const timeValueMap = {};

    cloneActivties.forEach((item) => {
      const { distance, movingTime, elapsedTime, startDateLocal } = item;

      const timeString = startDateLocal.toISOString();
      if (timeValueMap[timeString]) {
        timeValueMap[timeString].distance += distance;
        timeValueMap[timeString].movingTime += movingTime;
        timeValueMap[timeString].elapsedTime += elapsedTime;
      } else {
        timeValueMap[timeString] = {
          distance,
          movingTime,
          elapsedTime,
          startDateLocal,
        };
      }
    });

    // Convert the timeValueMap object back to an array
    for (const key in timeValueMap) {
      dailyActivities.push(timeValueMap[key]);
    }

    return dailyActivities;
  }
}
