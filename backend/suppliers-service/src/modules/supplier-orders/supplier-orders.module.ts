import { Module } from '@nestjs/common';
import { SupplierOrdersController } from './supplier-orders.controller';
import { SupplierOrdersService } from './supplier-orders.service';
import { SupplierOrderRepository } from './repositories/supplier-order.repository';

@Module({
  controllers: [SupplierOrdersController],
  providers: [SupplierOrdersService, SupplierOrderRepository],
  exports: [SupplierOrdersService],
})
export class SupplierOrdersModule {}
