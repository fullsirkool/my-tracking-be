import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../_modules_/prisma/prisma.service';

@Processor('activity')
export class ActivityTaskProcessor {
  constructor(private readonly prisma: PrismaService) {}

  @Process('import')
  async handleActivityTask(job: Job) {
    const { userId, activity, splits_metric } = job.data;
    const { id, distance, movingTime, elapsedTime, startDateLocal } = activity;
    let isValid = true;
    if (distance < 1000) {
      isValid = false;
    }

    let activityMinPace =
      splits_metric[0].moving_time / (splits_metric[0].distance / 1000);
    let activityMaxPace =
      splits_metric[0].moving_time / (splits_metric[0].distance / 1000);

    splits_metric.forEach((element) => {
      const { distance, moving_time } = element;
      if (distance < 100) {
        return;
      }

      const pace = moving_time / (distance / 1000);
      activityMinPace = Math.min(activityMinPace, pace);
      activityMaxPace = Math.max(activityMaxPace, pace);
    });

    const challenges = await this.prisma.challengeUser.findMany({
      where: {
        userId,
        challenge: {
          startDate: {
            lte: new Date(),
          },
          endDate: {
            gte: new Date(),
          },
        },
      },
      select: {
        id: true,
        challenge: {
          include: {
            rule: true,
          },
        },
      },
      orderBy: {
        challengeId: 'asc',
      },
    });

    const challengeActivities = challenges.map((element) => {
      const { challenge } = element;
      const { rule } = challenge;
      const { minPace, maxPace } = rule;
      let isValid = false;
      if (activityMaxPace <= maxPace && activityMinPace >= minPace) {
        isValid = true;
      }
      return {
        activityId: `${id}`,
        challengeId: challenge.id,
        userId,
        isValid,
      };
    });

    await this.prisma.challengeActivity.createMany({
      data: challengeActivities,
    });

    const findDate = new Date(startDateLocal);
    findDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(
      findDate.getFullYear(),
      findDate.getMonth(),
      findDate.getDate() + 1,
    );

    const dailyChallengeActivities =
      await this.prisma.challengeDailyActivity.findMany({
        where: {
          userId,
          startDateLocal: {
            gte: findDate,
            lte: nextDate,
          },
        },
        orderBy: {
          challengeId: 'asc',
        },
      });

    if (!dailyChallengeActivities.length) {
      const challengeDailyActivityPayload = challengeActivities.map((item) => {
        const { challengeId, userId, isValid } = item;
        return {
          distance: isValid ? distance : 0,
          movingTime: isValid ? distance : 0,
          elapsedTime: isValid ? distance : 0,
          startDateLocal: findDate,
          userId,
          challengeId,
        };
      });
      return await this.prisma.challengeDailyActivity.createMany({
        data: challengeDailyActivityPayload,
      });
    }

    const challengeDailyActivityPayload = dailyChallengeActivities.map(
      (item, index) => {
        const challenge = challengeActivities[index];
        challenge.isValid;
        const { challengeId, userId } = item;
        return {
          distance: isValid ? distance + item.distance : item.distance,
          movingTime: isValid ? movingTime + item.movingTime : item.movingTime,
          elapsedTime: isValid
            ? elapsedTime + item.elapsedTime
            : item.elapsedTime,
          startDateLocal: findDate,
          challengeId,
          userId,
        };
      },
    );

    return await this.prisma.challengeDailyActivity.updateMany({
      data: challengeDailyActivityPayload,
    });
  }
}
