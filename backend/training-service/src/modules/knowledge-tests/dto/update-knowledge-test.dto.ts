import { PartialType } from '@nestjs/swagger';
import { CreateKnowledgeTestDto } from './create-knowledge-test.dto';
export class UpdateKnowledgeTestDto extends PartialType(
  CreateKnowledgeTestDto,
) {}
