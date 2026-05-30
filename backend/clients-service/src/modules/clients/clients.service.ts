import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientsRepository } from './repositories/clients.repository';
import { NotificationsClientService } from '../../common/notifications/notifications-client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

// Admins + PM get client activity
const CLIENT_ADMIN_ROLES = [1, 2, 4];

@Injectable()
export class ClientsService {
  constructor(
    private readonly repo: ClientsRepository,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    status?: string,
    managerId?: number,
  ) {
    return this.repo.findAll(accountId, page, limit, status, managerId);
  }

  async findById(id: number, accountId: number) {
    const c = await this.repo.findById(id, accountId);
    if (!c) throw new NotFoundException(`Client #${id} not found`);
    return c;
  }

  async create(accountId: number, dto: CreateClientDto, actorUserId?: number) {
    const client = await this.repo.create(accountId, dto);

    const clientName =
      client.companyName ||
      [client.firstName, client.lastName].filter(Boolean).join(' ') ||
      'Клиент';

    void this.notificationsClient.broadcast({
      accountId,
      roleIds: CLIENT_ADMIN_ROLES,
      userIds: client.assignedManagerId ? [client.assignedManagerId] : [],
      excludeUserId: actorUserId,
      title: `Добавлен клиент: ${clientName}`,
      notificationType: 'client_created',
      priority: 1,
      channels: ['in_app'],
      actionUrl: `/dashboard/clients/${client.id}`,
      entityType: 'client',
      entityId: client.id,
    });

    return client;
  }

  async update(id: number, accountId: number, dto: UpdateClientDto) {
    await this.findById(id, accountId);
    return this.repo.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.repo.delete(id, accountId);
  }
}
