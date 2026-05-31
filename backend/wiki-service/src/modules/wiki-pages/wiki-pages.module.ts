import { Module } from '@nestjs/common';
import { WikiPagesController } from './wiki-pages.controller';
import { WikiPagesService } from './wiki-pages.service';
import { WikiPageRepository } from './repositories/wiki-page.repository';
import { WikiDraftsModule } from '../wiki-drafts/wiki-drafts.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, WikiDraftsModule],
  controllers: [WikiPagesController],
  providers: [WikiPagesService, WikiPageRepository],
  exports: [WikiPagesService],
})
export class WikiPagesModule {}
