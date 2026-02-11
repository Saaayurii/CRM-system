import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeDocumentDto } from './create-employee-document.dto';

export class UpdateEmployeeDocumentDto extends PartialType(
  CreateEmployeeDocumentDto,
) {}
