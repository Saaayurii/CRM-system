import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ClientPortalAccessRepository } from './repositories/client-portal-access.repository';
import { CreateClientPortalAccessDto } from './dto/create-client-portal-access.dto';
import { UpdateClientPortalAccessDto } from './dto/update-client-portal-access.dto';
import { PrismaService } from '../../database/prisma.service';

const CLIENT_ROLE_ID = 15;

@Injectable()
export class ClientPortalAccessService {
  private readonly logger = new Logger(ClientPortalAccessService.name);

  constructor(
    private readonly repo: ClientPortalAccessRepository,
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async findAll(page: number, limit: number, clientId?: number) {
    return this.repo.findAll(page, limit, clientId);
  }

  async findById(id: number) {
    const r = await this.repo.findById(id);
    if (!r)
      throw new NotFoundException(`Client portal access #${id} not found`);
    return r;
  }

  async create(dto: CreateClientPortalAccessDto, authHeader?: string) {
    const client = await (this.prisma as any).client.findUnique({
      where: { id: dto.clientId },
    });
    if (!client) throw new NotFoundException(`Client #${dto.clientId} not found`);

    const accessToken = dto.accessToken ?? crypto.randomBytes(32).toString('hex');
    let userId: number | undefined;
    let passwordHash: string | undefined;
    const login = dto.login?.trim() || undefined;

    if (dto.password && !login) {
      throw new BadRequestException('Login is required when password is provided');
    }

    if (login && dto.password) {
      const existing = await (this.prisma as any).clientPortalAccess.findFirst({
        where: { login },
      });
      if (existing) throw new ConflictException(`Login "${login}" already used`);

      passwordHash = await bcrypt.hash(dto.password, 10);

      const fullName = [client.lastName, client.firstName, client.middleName]
        .filter(Boolean)
        .join(' ') || client.companyName || login;

      const user = await (this.prisma as any).user.create({
        data: {
          accountId: client.accountId,
          roleId: CLIENT_ROLE_ID,
          name: fullName,
          email: login,
          passwordDigest: passwordHash,
          isActive: true,
          mustChangePassword: false,
        },
      });
      userId = user.id;
    }

    const access = await this.repo.create({
      ...dto,
      accessToken,
      login,
      passwordHash,
      userId,
    });

    if (dto.createChat !== false) {
      await this.tryCreateClientChat(client, dto.projectId, userId, authHeader);
    }

    const { passwordHash: _ph, ...safe } = access as any;
    return safe;
  }

  async update(id: number, dto: UpdateClientPortalAccessDto) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      delete data.password;
    }
    delete data.createChat;
    return this.repo.update(id, data);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  private async tryCreateClientChat(
    client: any,
    projectId: number,
    clientUserId: number | undefined,
    authHeader?: string,
  ) {
    const chatUrl = this.config.get<string>('CHAT_SERVICE_URL');
    if (!chatUrl || !authHeader) return;
    try {
      const project = await (this.prisma as any).project.findUnique({
        where: { id: projectId },
        select: { name: true },
      }).catch(() => null);
      const channelName = `Клиент: ${client.companyName || [client.firstName, client.lastName].filter(Boolean).join(' ') || `#${client.id}`}${project?.name ? ` — ${project.name}` : ''}`;

      // Собеседник клиента: ответственный менеджер, иначе создатель (админ) проекта.
      let counterpartId: number | undefined = client.assignedManagerId ?? undefined;
      if (!counterpartId) {
        try {
          const rows: any[] = await (this.prisma as any).$queryRaw`
            SELECT created_by_user_id FROM projects WHERE id = ${projectId} LIMIT 1`;
          counterpartId = rows?.[0]?.created_by_user_id ?? undefined;
        } catch {
          /* проект без создателя — создаём чат хотя бы с клиентом */
        }
      }

      const memberIds = [clientUserId, counterpartId].filter(
        (v): v is number => typeof v === 'number',
      );

      await firstValueFrom(
        this.http.post(
          `${chatUrl}/chat-channels`,
          {
            name: channelName,
            type: 'private',
            projectId,
            memberIds,
          },
          { headers: { Authorization: authHeader } },
        ),
      );
    } catch (e: any) {
      this.logger.warn(`Failed to auto-create client chat: ${e?.message}`);
    }
  }
}
