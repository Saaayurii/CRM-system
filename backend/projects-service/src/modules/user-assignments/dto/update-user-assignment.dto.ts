import { PartialType } from '@nestjs/swagger';
import { CreateUserAssignmentDto } from './create-user-assignment.dto';

export class UpdateUserAssignmentDto extends PartialType(CreateUserAssignmentDto) {}
