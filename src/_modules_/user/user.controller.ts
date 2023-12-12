import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags } from '@nestjs/swagger';
import { UserTransformInterceptor } from 'src/interceptors/user.transform';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseInterceptors(UserTransformInterceptor)
  @Get('/:id')
  async find(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }
}
