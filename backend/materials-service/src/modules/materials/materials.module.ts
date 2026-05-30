import { Module } from '@nestjs/common';
import {
  MaterialsController,
  MaterialCategoriesController,
} from './materials.controller';
import { MaterialsService } from './materials.service';
import { MaterialRepository } from './repositories/material.repository';
import { NotificationsClientModule } from '../../common/notifications/notifications-client.module';

@Module({
  imports: [NotificationsClientModule],
  controllers: [MaterialsController, MaterialCategoriesController],
  providers: [MaterialsService, MaterialRepository],
  exports: [MaterialsService],
})
export class MaterialsModule {}
