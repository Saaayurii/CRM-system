import { Module } from '@nestjs/common';
import { WikiPagesController } from './wiki-pages.controller';
import { WikiPagesService } from './wiki-pages.service';
import { WikiPageRepository } from './repositories/wiki-page.repository';
@Module({ controllers: [WikiPagesController], providers: [WikiPagesService, WikiPageRepository], exports: [WikiPagesService] })
export class WikiPagesModule {}
