import { Module } from '@nestjs/common';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';
import { EmployeeDocumentRepository } from './repositories/employee-document.repository';

@Module({
  controllers: [EmployeeDocumentsController],
  providers: [EmployeeDocumentsService, EmployeeDocumentRepository],
  exports: [EmployeeDocumentsService],
})
export class EmployeeDocumentsModule {}
