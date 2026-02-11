import { PartialType } from '@nestjs/swagger';
import { CreateTaskTimeLogDto } from './create-task-time-log.dto';

export class UpdateTaskTimeLogDto extends PartialType(CreateTaskTimeLogDto) {}
