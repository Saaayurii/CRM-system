import { PartialType } from '@nestjs/swagger';
import { CreateGeneratedReportDto } from './create-generated-report.dto';

export class UpdateGeneratedReportDto extends PartialType(
  CreateGeneratedReportDto,
) {}
