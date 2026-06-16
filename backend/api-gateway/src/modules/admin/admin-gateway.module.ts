import { Module } from '@nestjs/common';
import { StorageStatusController } from './storage-status.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [StorageStatusController],
})
export class AdminGatewayModule {}
