import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { UserModule } from '../user/user.module';
import { AdminModule } from '../admin/admin.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from '../../strategies/local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    UserModule,
    HttpModule,
    AdminModule,
    PassportModule,
    JwtModule,
    forwardRef(() => ActivityModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
