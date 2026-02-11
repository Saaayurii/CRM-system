import { Module } from '@nestjs/common';
import { KnowledgeTestsController } from './knowledge-tests.controller';
import { KnowledgeTestsService } from './knowledge-tests.service';
import { KnowledgeTestRepository } from './repositories/knowledge-test.repository';
@Module({ controllers: [KnowledgeTestsController], providers: [KnowledgeTestsService, KnowledgeTestRepository], exports: [KnowledgeTestsService] })
export class KnowledgeTestsModule {}
