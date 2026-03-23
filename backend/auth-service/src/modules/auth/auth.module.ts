import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from './repositories/role.repository';
import { AccountRepository } from './repositories/account.repository';
import { RegistrationRequestRepository } from './repositories/registration-request.repository';
import { SessionRepository } from './repositories/session.repository';
import { JwtStrategy } from '../../common/guards/jwt.strategy';
import { SessionBlacklistService } from '../../common/services/session-blacklist.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        ({
          secret:
            configService.get<string>('jwt.accessSecret') || 'default-secret',
          signOptions: {
            expiresIn:
              configService.get<string>('jwt.accessExpiration') || '15m',
          },
        }) as any,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    PasswordService,
    UserRepository,
    RoleRepository,
    AccountRepository,
    RegistrationRequestRepository,
    SessionRepository,
    JwtStrategy,
    SessionBlacklistService,
  ],
  exports: [AuthService, TokenService, PasswordService, SessionBlacklistService],
})
export class AuthModule {}
