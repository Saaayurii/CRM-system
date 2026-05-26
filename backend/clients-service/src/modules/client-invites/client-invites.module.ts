import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClientInvitesController } from './client-invites.controller';
import { ClientInvitesService } from './client-invites.service';
import { ClientInviteRepository } from './repositories/client-invite.repository';
import { ClientPortalAccessModule } from '../client-portal-access/client-portal-access.module';
import { ClientPortalAccessRepository } from '../client-portal-access/repositories/client-portal-access.repository';

@Module({
  imports: [HttpModule.register({ timeout: 5000 }), ClientPortalAccessModule],
  controllers: [ClientInvitesController],
  providers: [ClientInvitesService, ClientInviteRepository, ClientPortalAccessRepository],
})
export class ClientInvitesModule {}
