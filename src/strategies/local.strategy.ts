import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import {AdminService} from "../_modules_/admin/admin.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private adminService: AdminService) {
    super();
  }

  async validate(username: string, password: string): Promise<any> {
    const admin = await this.adminService.validateAdmin({ username, password });
    if (!admin) {
      throw new UnauthorizedException();
    }
    return admin;
  }
}
