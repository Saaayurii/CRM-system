import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: AuthenticatedSocket = context.switchToWs().getClient();

    if (client.user) return true;

    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn('WS connection rejected: no token provided');
      client.disconnect();
      return false;
    }

    try {
      const secret =
        this.configService.get<string>('jwt.accessSecret') || 'default-secret';
      const payload = jwt.verify(token, secret) as any;

      client.user = {
        id: payload.sub,
        email: payload.email,
        roleId: payload.roleId,
        accountId: payload.accountId,
        name: payload.name || payload.email,
      };

      return true;
    } catch (error) {
      this.logger.warn(
        `WS connection rejected: invalid token — ${(error as Error).message}`,
      );
      client.disconnect();
      return false;
    }
  }
}
