import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();

    let message = 'Internal server error';

    if (exception instanceof WsException) {
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`WS Error: ${exception.message}`, exception.stack);
    }

    client.emit('error', { message, timestamp: new Date().toISOString() });
  }
}
