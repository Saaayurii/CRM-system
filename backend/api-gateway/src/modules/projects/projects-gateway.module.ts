import { Module } from '@nestjs/common';
import { ProjectsGatewayController } from './projects-gateway.controller';
import { ConstructionSitesGatewayController } from './construction-sites-gateway.controller';
import { ObjectsGatewayController } from './objects-gateway.controller';
import { FacilitiesGatewayController } from './facilities-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [ProjectsGatewayController, ConstructionSitesGatewayController, ObjectsGatewayController, FacilitiesGatewayController],
})
export class ProjectsGatewayModule {}
