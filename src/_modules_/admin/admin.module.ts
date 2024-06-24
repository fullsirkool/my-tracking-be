import {forwardRef, Module} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import {AuthModule} from "../auth/auth.module";
import {JwtRefreshAdminStrategy} from "../../strategies/jwt-refresh-admin.strategy";
import {LocalStrategy} from "../../strategies/local.strategy";
import {JwtModule} from "@nestjs/jwt";

@Module({
  imports: [JwtModule],
  controllers: [AdminController],
  providers: [AdminService, LocalStrategy, JwtRefreshAdminStrategy],
  exports: [AdminService],
})
export class AdminModule {}
