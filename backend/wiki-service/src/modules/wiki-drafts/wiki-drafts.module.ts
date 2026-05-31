import { Module } from '@nestjs/common';
import { WikiDraftsController } from './wiki-drafts.controller';
import { WikiDraftsService } from './wiki-drafts.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WikiDraftsController],
  providers: [WikiDraftsService],
  exports: [WikiDraftsService],
})
export class WikiDraftsModule {}
