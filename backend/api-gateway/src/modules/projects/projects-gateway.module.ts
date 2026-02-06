import { Module } from '@nestjs/common';
import { ProjectsGatewayController } from './projects-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [ProjectsGatewayController],
})
export class ProjectsGatewayModule {}
