import { PartialType } from '@nestjs/swagger';
import { CreateClientInteractionDto } from './create-client-interaction.dto';
export class UpdateClientInteractionDto extends PartialType(
  CreateClientInteractionDto,
) {}
