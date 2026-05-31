import { Module } from '@nestjs/common';
import { NormCategoriesController } from './norm-categories.controller';
import { NormCategoriesService } from './norm-categories.service';
import { NormDocumentsController } from './norm-documents.controller';
import { NormDocumentsService } from './norm-documents.service';
import { NormBookmarksController } from './norm-bookmarks.controller';
import { NormBookmarksService } from './norm-bookmarks.service';

@Module({
  controllers: [
    NormCategoriesController,
    NormDocumentsController,
    NormBookmarksController,
  ],
  providers: [
    NormCategoriesService,
    NormDocumentsService,
    NormBookmarksService,
  ],
})
export class ConstructionNormsModule {}
