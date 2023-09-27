import { CreateAdminDto } from './admin.dto';
import { Body, Controller, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('admin')
@ApiTags('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('')
  async create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }
}
