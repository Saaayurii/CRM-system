import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProxyService } from './proxy.service';
import { RequestContextService } from './request-context.service';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [ProxyService, RequestContextService],
  exports: [ProxyService, HttpModule, RequestContextService],
})
export class ProxyModule {}
