import { Module } from '@nestjs/common';
import { DocumentTemplatesController } from './document-templates.controller';
import { DocumentTemplatesService } from './document-templates.service';
import { DocumentTemplateRepository } from './repositories/document-template.repository';

@Module({
  controllers: [DocumentTemplatesController],
  providers: [DocumentTemplatesService, DocumentTemplateRepository],
  exports: [DocumentTemplatesService],
})
export class DocumentTemplatesModule {}
