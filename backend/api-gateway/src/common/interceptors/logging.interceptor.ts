import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const responseTime = Date.now() - now;

          this.logger.log(
            `${method} ${url} ${statusCode} ${responseTime}ms - ${ip} "${userAgent}"`,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          const statusCode = error?.status || error?.response?.status || 500;

          this.logger.error(
            `${method} ${url} ${statusCode} ${responseTime}ms - ${ip} "${userAgent}" - ${error.message}`,
          );
        },
      }),
    );
  }
}
