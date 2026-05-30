import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SupplierRepository } from './repositories/supplier.repository';
import { NotificationsClientModule } from '../../common/notifications/notifications-client.module';

@Module({
  imports: [NotificationsClientModule],
  controllers: [SuppliersController],
  providers: [SuppliersService, SupplierRepository],
  exports: [SuppliersService],
})
export class SuppliersModule {}
