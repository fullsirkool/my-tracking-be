import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule, HttpModule],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
