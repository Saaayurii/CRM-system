import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../services/request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const headerValue = req.headers['x-account-id'];
    const accountIdOverride = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    this.requestContext.run(
      { accountIdOverride: accountIdOverride || undefined },
      () => next(),
    );
  }
}
