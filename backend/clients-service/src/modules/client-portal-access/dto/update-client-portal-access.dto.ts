import { PartialType } from '@nestjs/swagger';
import { CreateClientPortalAccessDto } from './create-client-portal-access.dto';
export class UpdateClientPortalAccessDto extends PartialType(CreateClientPortalAccessDto) {}
