import { Module } from '@nestjs/common';
import { ProjectsGatewayController } from './projects-gateway.controller';
import { ConstructionSitesGatewayController } from './construction-sites-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [ProjectsGatewayController, ConstructionSitesGatewayController],
})
export class ProjectsGatewayModule {}
