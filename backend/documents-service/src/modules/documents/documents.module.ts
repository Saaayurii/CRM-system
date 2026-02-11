import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentRepository } from './repositories/document.repository';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentRepository],
  exports: [DocumentsService],
})
export class DocumentsModule {}
