import { Module } from '@nestjs/common';
import { WorkTemplatesController } from './work-templates.controller';
import { WorkTemplatesService } from './work-templates.service';
import { WorkTemplateRepository } from './repositories/work-template.repository';

@Module({
  controllers: [WorkTemplatesController],
  providers: [WorkTemplatesService, WorkTemplateRepository],
  exports: [WorkTemplatesService],
})
export class WorkTemplatesModule {}
