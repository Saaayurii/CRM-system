import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ActRepository } from './repositories/act.repository';
import { CreateActDto } from './dto/create-act.dto';
import { UpdateActDto } from './dto/update-act.dto';
import { CreateActItemDto } from './dto/create-act-item.dto';
import { PrismaService } from '../../database/prisma.service';
import {
  CLIENT_ROLE_ID,
  RequestUser,
  getClientAllowedProjectIds,
  sanitizeActForClient,
} from '../../common/helpers/client-access.helper';

@Injectable()
export class ActsService {
  constructor(
    private readonly actRepository: ActRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(user: RequestUser, page: number, limit: number, projectId?: number) {
    const allowedProjectIds = await getClientAllowedProjectIds(this.prisma, user);
    const result = await this.actRepository.findAll(
      user.accountId,
      page,
      limit,
      projectId,
      allowedProjectIds,
    );
    if (user.roleId === CLIENT_ROLE_ID && Array.isArray(result?.data)) {
      result.data = result.data.map((a: any) => sanitizeActForClient(user, a));
    }
    return result;
  }

  async findById(id: number, user: RequestUser) {
    const act = await this.actRepository.findById(id, user.accountId);
    if (!act) {
      throw new NotFoundException(`Act with ID ${id} not found`);
    }
    if (user.roleId === CLIENT_ROLE_ID) {
      const allowed = await getClientAllowedProjectIds(this.prisma, user);
      if (!act.projectId || !allowed?.includes(act.projectId)) {
        throw new ForbiddenException('Access denied');
      }
      return sanitizeActForClient(user, act);
    }
    return act;
  }

  async create(accountId: number, dto: CreateActDto, preparedByUserId: number) {
    return this.actRepository.create(accountId, dto, preparedByUserId);
  }

  async update(id: number, accountId: number, dto: UpdateActDto) {
    const act = await this.actRepository.findById(id, accountId);
    if (!act) throw new NotFoundException(`Act with ID ${id} not found`);
    return this.actRepository.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    const act = await this.actRepository.findById(id, accountId);
    if (!act) throw new NotFoundException(`Act with ID ${id} not found`);
    return this.actRepository.delete(id, accountId);
  }

  async createItem(id: number, accountId: number, dto: CreateActItemDto) {
    const act = await this.actRepository.findById(id, accountId);
    if (!act) throw new NotFoundException(`Act with ID ${id} not found`);
    return this.actRepository.createItem(id, dto);
  }
}
