import { Module } from '@nestjs/common';
import { TestAttemptsController } from './test-attempts.controller';
import { TestAttemptsService } from './test-attempts.service';
import { TestAttemptRepository } from './repositories/test-attempt.repository';
@Module({
  controllers: [TestAttemptsController],
  providers: [TestAttemptsService, TestAttemptRepository],
  exports: [TestAttemptsService],
})
export class TestAttemptsModule {}
