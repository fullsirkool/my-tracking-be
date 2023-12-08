import {Module, forwardRef} from '@nestjs/common';
import {AuthService} from './auth.service';
import {AuthController} from './auth.controller';
import {HttpModule} from '@nestjs/axios';
import {UserModule} from '../user/user.module';
import {AdminModule} from '../admin/admin.module';
import {PassportModule} from '@nestjs/passport';
import {LocalStrategy} from '../../strategies/local.strategy';
import {JwtModule} from '@nestjs/jwt';
import {ActivityModule} from '../activity/activity.module';
import {JwtRefreshStrategy} from 'src/strategies/jwt-refresh.strategy';
import {MailModule} from "../mail/mail.module";

@Module({
    imports: [
        UserModule,
        HttpModule,
        AdminModule,
        PassportModule,
        JwtModule,
        MailModule,
        forwardRef(() => ActivityModule),
    ],
    controllers: [AuthController],
    providers: [AuthService, LocalStrategy, JwtRefreshStrategy],
    exports: [AuthService],
})
export class AuthModule {
}
