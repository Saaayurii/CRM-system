import { Module } from '@nestjs/common';
import { DashboardWidgetsController } from './dashboard-widgets.controller';
import { DashboardWidgetsService } from './dashboard-widgets.service';
import { DashboardWidgetRepository } from './repositories/dashboard-widget.repository';
@Module({ controllers: [DashboardWidgetsController], providers: [DashboardWidgetsService, DashboardWidgetRepository], exports: [DashboardWidgetsService] })
export class DashboardWidgetsModule {}
