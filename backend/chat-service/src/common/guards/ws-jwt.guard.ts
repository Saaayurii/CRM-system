import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';
import { verifyJwtToken, tokenFromHandshake } from './jwt-key.options';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: AuthenticatedSocket = context.switchToWs().getClient();

    if (client.user) return true;

    const token = tokenFromHandshake(client.handshake);

    if (!token) {
      this.logger.warn('WS connection rejected: no token provided');
      client.disconnect();
      return false;
    }

    try {
      // RS256/HS256-совместимая проверка (access-токены могут быть RS256)
      const payload = verifyJwtToken(token, this.configService) as any;

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
