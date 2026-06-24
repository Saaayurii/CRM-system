import { Module } from '@nestjs/common';
import { ShareLinksController } from './share-links.controller';
import { ShareLinksService } from './share-links.service';
import { ShareLinkRepository } from './repositories/share-link.repository';

@Module({
  controllers: [ShareLinksController],
  providers: [ShareLinksService, ShareLinkRepository],
  exports: [ShareLinksService],
})
export class ShareLinksModule {}
