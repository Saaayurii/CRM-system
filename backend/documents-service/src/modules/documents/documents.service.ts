import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DocumentRepository } from './repositories/document.repository';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PrismaService } from '../../database/prisma.service';
import {
  CLIENT_ROLE_ID,
  RequestUser,
  getClientAllowedProjectIds,
} from '../../common/helpers/client-access.helper';

// Роли, которым разрешено видеть документы с accessLevel = 'restricted'
const RESTRICTED_ALLOWED_ROLES = new Set([1, 2, 3, 4, 8, 14]);

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(
    user: RequestUser,
    page: number,
    limit: number,
    filters?: { projectId?: number; documentType?: string; status?: string; constructionSiteId?: number; search?: string },
  ) {
    const allowedProjectIds = await getClientAllowedProjectIds(this.prisma, user);
    const excludeRestricted = !RESTRICTED_ALLOWED_ROLES.has(user.roleId as number);
    return this.documentRepository.findAll(user.accountId, page, limit, {
      ...filters,
      allowedProjectIds,
      excludeRestricted,
    });
  }

  async findById(id: number, user: RequestUser) {
    const document = await this.documentRepository.findById(id, user.accountId);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    if (document.accessLevel === 'restricted' && !RESTRICTED_ALLOWED_ROLES.has(user.roleId as number)) {
      throw new ForbiddenException('Access denied');
    }
    if (user.roleId === CLIENT_ROLE_ID) {
      const allowed = await getClientAllowedProjectIds(this.prisma, user);
      if (document.projectId && !allowed?.includes(document.projectId)) {
        throw new ForbiddenException('Access denied');
      }
    }
    return document;
  }

  async create(accountId: number, dto: CreateDocumentDto) {
    return this.documentRepository.create(accountId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateDocumentDto) {
    const document = await this.documentRepository.findById(id, accountId);
    if (!document) throw new NotFoundException(`Document with ID ${id} not found`);
    return this.documentRepository.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    const document = await this.documentRepository.findById(id, accountId);
    if (!document) throw new NotFoundException(`Document with ID ${id} not found`);
    return this.documentRepository.delete(id, accountId);
  }
}
