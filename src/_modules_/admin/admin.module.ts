import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { JwtRefreshAdminStrategy } from '../../strategies/jwt-refresh-admin.strategy';
import { LocalStrategy } from '../../strategies/local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { JwtAdminStrategy } from '../../strategies/jwt.admin.strategy';

@Module({
  imports: [JwtModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    LocalStrategy,
    JwtRefreshAdminStrategy,
    JwtAdminStrategy,
  ],
  exports: [AdminService],
})
export class AdminModule {}
