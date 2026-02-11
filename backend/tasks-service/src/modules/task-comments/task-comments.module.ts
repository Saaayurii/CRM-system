import { Module } from '@nestjs/common';
import { TaskCommentsController } from './task-comments.controller';
import { TaskCommentsService } from './task-comments.service';
import { TaskCommentRepository } from './repositories/task-comment.repository';

@Module({
  controllers: [TaskCommentsController],
  providers: [TaskCommentsService, TaskCommentRepository],
  exports: [TaskCommentsService],
})
export class TaskCommentsModule {}
