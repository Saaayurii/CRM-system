import {
  Injectable,
  NotFoundException,
  GoneException,
} from '@nestjs/common';
import { ShareLinkRepository } from './repositories/share-link.repository';
import { CreateShareLinkDto } from './dto';

@Injectable()
export class ShareLinksService {
  constructor(private readonly repo: ShareLinkRepository) {}

  findAll(accountId: number, entityType?: string, entityId?: number) {
    return this.repo.findAll(accountId, entityType, entityId);
  }

  create(accountId: number, dto: CreateShareLinkDto, actorUserId?: number) {
    return this.repo.create(accountId, {
      entityType: dto.entityType,
      entityId: dto.entityId,
      title: dto.title,
      createdByUserId: actorUserId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
  }

  async revoke(id: number, accountId: number) {
    const existing = await this.repo.findById(id, accountId);
    if (!existing) throw new NotFoundException(`ShareLink #${id} not found`);
    await this.repo.revoke(id, accountId);
    return { message: `ShareLink #${id} revoked` };
  }

  // Публичный резолв токена → данные ссылки. Валидирует отзыв/срок,
  // инкрементит счётчик просмотров. Бросает 404/410 при недоступности.
  async resolve(token: string) {
    const link = await this.repo.findByToken(token);
    if (!link) throw new NotFoundException('Ссылка не найдена');
    if (link.revokedAt) throw new GoneException('Ссылка отозвана');
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      throw new GoneException('Срок действия ссылки истёк');
    }

    // Просмотр учитываем «по возможности» — счётчик не должен ломать ответ.
    void this.repo.markViewed(link.id).catch(() => undefined);

    return {
      entityType: link.entityType,
      entityId: link.entityId,
      accountId: link.accountId,
      title: link.title ?? null,
      createdByUserId: link.createdByUserId ?? null,
    };
  }
}
