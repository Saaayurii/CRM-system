import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClientPortalAccessController } from './client-portal-access.controller';
import { ClientPortalAccessService } from './client-portal-access.service';
import { ClientPortalAccessRepository } from './repositories/client-portal-access.repository';

@Module({
  imports: [HttpModule.register({ timeout: 5000 })],
  controllers: [ClientPortalAccessController],
  providers: [ClientPortalAccessService, ClientPortalAccessRepository],
  exports: [ClientPortalAccessService],
})
export class ClientPortalAccessModule {}
