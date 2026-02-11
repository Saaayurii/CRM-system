import { Module } from '@nestjs/common';
import { TrainingGatewayController } from './training-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [TrainingGatewayController],
})
export class TrainingGatewayModule {}
