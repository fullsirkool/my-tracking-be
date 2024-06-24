import {CreateAdminDto} from './admin.dto';
import {Body, Controller, Post, UseGuards} from '@nestjs/common';
import {AdminService} from './admin.service';
import {ApiBody, ApiTags} from '@nestjs/swagger';
import {LocalAuthGuard} from "../../guards/local-auth.guard";
import {RenewDto, SignInAdminDto} from "../auth/auth.dto";
import {Admin} from "../../decorators/admin.decorator";
import {Claims} from "../../types/auth.types";
import {AuthService} from "../auth/auth.service";
import {User} from "../../decorators/user.decorator";
import {JwtRefreshAdminStrategy} from "../../strategies/jwt-refresh-admin.strategy";
import {JwtRefreshAdminAuthGuard} from "../../guards/jwt-refresh-admin.guard";

@Controller('/auth/admin')
@ApiTags('/auth/admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {
    }

    @Post('')
    async create(@Body() createAdminDto: CreateAdminDto) {
        return this.adminService.create(createAdminDto);
    }

    @UseGuards(LocalAuthGuard)
    @ApiBody({type: SignInAdminDto})
    @Post('/sign-in')
    async login(@Admin() claims: Claims) {
        return this.adminService.signInAdmin(claims);
    }

    @Post('/renew')
    @ApiBody({type: RenewDto})
    @UseGuards(JwtRefreshAdminAuthGuard)
    async refreshToken(
        @Admin('id') adminId: number,
        @Body('refreshToken') refreshToken: string,
    ) {
        return this.adminService.renewAdminToken(adminId, refreshToken);
    }
}
