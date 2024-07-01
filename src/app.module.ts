import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './_modules_/auth/auth.module';
import { UserModule } from './_modules_/user/user.module';
import { PrismaModule } from './_modules_/prisma/prisma.module';
import { ActivityModule } from './_modules_/activity/activity.module';
import { AdminModule } from './_modules_/admin/admin.module';
import { DailyActivtyModule } from './_modules_/daily-activty/daily-activty.module';
import { ChallengeModule } from './_modules_/challenge/challenge.module';
import { FileModule } from './_modules_/file/file.module';
import { FirebaseModule } from './_modules_/firebase/firebase.module';
import { BullModule } from '@nestjs/bull';
import { MailModule } from './_modules_/mail/mail.module';
import { PaymentModule } from './_modules_/payment/payment.module';
import { S3Module } from './_modules_/s3/s3.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot(),
    UserModule,
    AuthModule,
    ActivityModule,
    AdminModule,
    DailyActivtyModule,
    ChallengeModule,
    FileModule,
    FirebaseModule,
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    MailModule,
    PaymentModule,
    S3Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
