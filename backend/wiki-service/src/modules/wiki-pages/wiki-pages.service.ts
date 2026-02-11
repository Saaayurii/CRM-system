import { Injectable, NotFoundException } from '@nestjs/common';
import { WikiPageRepository } from './repositories/wiki-page.repository';
import { CreateWikiPageDto } from './dto/create-wiki-page.dto';
import { UpdateWikiPageDto } from './dto/update-wiki-page.dto';

@Injectable()
export class WikiPagesService {
  constructor(private readonly wikiPageRepository: WikiPageRepository) {}
  async findAll(
    accountId: number,
    page: number,
    limit: number,
    category?: string,
  ) {
    return this.wikiPageRepository.findAll(accountId, page, limit, category);
  }
  async findById(id: number, accountId: number) {
    const p = await this.wikiPageRepository.findById(id, accountId);
    if (!p) throw new NotFoundException(`Wiki page #${id} not found`);
    return p;
  }
  async create(accountId: number, userId: number, dto: CreateWikiPageDto) {
    return this.wikiPageRepository.create(accountId, userId, dto);
  }
  async update(
    id: number,
    accountId: number,
    userId: number,
    dto: UpdateWikiPageDto,
  ) {
    await this.findById(id, accountId);
    return this.wikiPageRepository.update(id, accountId, userId, dto);
  }
  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.wikiPageRepository.delete(id, accountId);
  }
}
