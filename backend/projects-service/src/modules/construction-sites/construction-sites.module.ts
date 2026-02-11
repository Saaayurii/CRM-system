import { Module } from '@nestjs/common';
import { ConstructionSitesController } from './construction-sites.controller';
import { ConstructionSitesService } from './construction-sites.service';
import { ConstructionSiteRepository } from './repositories/construction-site.repository';

@Module({
  controllers: [ConstructionSitesController],
  providers: [ConstructionSitesService, ConstructionSiteRepository],
  exports: [ConstructionSitesService],
})
export class ConstructionSitesModule {}
