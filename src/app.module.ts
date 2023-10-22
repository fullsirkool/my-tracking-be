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
import { ChallengeGroupModule } from './_modules_/challenge-group/challenge-group.module';
import { ChallengeUserModule } from './_modules_/challenge-user/challenge-user.module';
import { FileModule } from './_modules_/file/file.module';
import { FirebaseModule } from './_modules_/firebase/firebase.module';

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
    ChallengeGroupModule,
    ChallengeUserModule,
    FileModule,
    FirebaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
