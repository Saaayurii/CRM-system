import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  accountIdOverride?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

@Injectable()
export class RequestContextService {
  run<T>(context: RequestContext, fn: () => T): T {
    return storage.run(context, fn) as T;
  }

  getAccountIdOverride(): string | undefined {
    return storage.getStore()?.accountIdOverride;
  }
}
