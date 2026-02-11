import { Module } from '@nestjs/common';
import { TasksGatewayController } from './tasks-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [TasksGatewayController],
})
export class TasksGatewayModule {}
