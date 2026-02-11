import { Module } from '@nestjs/common';
import { ClientPortalAccessController } from './client-portal-access.controller';
import { ClientPortalAccessService } from './client-portal-access.service';
import { ClientPortalAccessRepository } from './repositories/client-portal-access.repository';

@Module({
  controllers: [ClientPortalAccessController],
  providers: [ClientPortalAccessService, ClientPortalAccessRepository],
  exports: [ClientPortalAccessService],
})
export class ClientPortalAccessModule {}
