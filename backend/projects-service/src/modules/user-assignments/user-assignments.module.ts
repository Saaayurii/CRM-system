import { Module } from '@nestjs/common';
import { UserAssignmentsController } from './user-assignments.controller';
import { UserAssignmentsService } from './user-assignments.service';
import { UserAssignmentRepository } from './repositories/user-assignment.repository';

@Module({
  controllers: [UserAssignmentsController],
  providers: [UserAssignmentsService, UserAssignmentRepository],
  exports: [UserAssignmentsService],
})
export class UserAssignmentsModule {}
