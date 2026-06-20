import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { PortalAuthService } from './services/portal-auth.service';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from './repositories/role.repository';
import { AccountRepository } from './repositories/account.repository';
import { RegistrationRequestRepository } from './repositories/registration-request.repository';
import { CompanyInviteRepository } from './repositories/company-invite.repository';
import { MemberInviteRepository } from './repositories/member-invite.repository';
import { SessionRepository } from './repositories/session.repository';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { RecoveryLogRepository } from './repositories/recovery-log.repository';
import { JwtStrategy } from '../../common/guards/jwt.strategy';
import { SessionBlacklistService } from '../../common/services/session-blacklist.service';
import { TotpService } from './services/totp.service';
import { MailService } from './services/mail.service';
import { MailProcessor, MAIL_QUEUE } from './queues/mail.queue';
import { MaintenanceProcessor, MAINTENANCE_QUEUE } from './queues/maintenance.queue';
import { LoginThrottleService } from '../../common/services/login-throttle.service';

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
    // BullMQ shared Redis connection + the "mail" queue (emails off the request thread).
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host') || 'localhost',
          port: configService.get<number>('redis.port') || 6379,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      }),
    }),
    BullModule.registerQueue({ name: MAIL_QUEUE }),
    BullModule.registerQueue({ name: MAINTENANCE_QUEUE }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PortalAuthService,
    TokenService,
    PasswordService,
    UserRepository,
    RoleRepository,
    AccountRepository,
    RegistrationRequestRepository,
    CompanyInviteRepository,
    MemberInviteRepository,
    SessionRepository,
    PasswordResetRepository,
    RecoveryLogRepository,
    JwtStrategy,
    SessionBlacklistService,
    TotpService,
    MailService,
    MailProcessor,
    MaintenanceProcessor,
    LoginThrottleService,
  ],
  exports: [AuthService, TokenService, PasswordService, SessionBlacklistService],
})
export class AuthModule {}
