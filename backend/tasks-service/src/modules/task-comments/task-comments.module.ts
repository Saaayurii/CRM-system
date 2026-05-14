import { Module } from '@nestjs/common';
import { TaskCommentsController } from './task-comments.controller';
import { TaskCommentsService } from './task-comments.service';
import { TaskCommentRepository } from './repositories/task-comment.repository';
import { NotificationsClientService } from './notifications-client.service';

@Module({
  controllers: [TaskCommentsController],
  providers: [TaskCommentsService, TaskCommentRepository, NotificationsClientService],
  exports: [TaskCommentsService],
})
export class TaskCommentsModule {}
