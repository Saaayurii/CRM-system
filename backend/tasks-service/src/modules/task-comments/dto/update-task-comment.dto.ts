import { PartialType } from '@nestjs/swagger';
import { CreateTaskCommentDto } from './create-task-comment.dto';

export class UpdateTaskCommentDto extends PartialType(CreateTaskCommentDto) {}
