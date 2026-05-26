import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  GoneException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ClientInviteRepository } from './repositories/client-invite.repository';
import { ClientPortalAccessRepository } from '../client-portal-access/repositories/client-portal-access.repository';
import { CreateClientInviteDto } from './dto/create-client-invite.dto';
import { AcceptClientInviteDto } from './dto/accept-client-invite.dto';
import { PrismaService } from '../../database/prisma.service';

const CLIENT_ROLE_ID = 15;

@Injectable()
export class ClientInvitesService {
  private readonly logger = new Logger(ClientInvitesService.name);

  constructor(
    private readonly repo: ClientInviteRepository,
    private readonly portalRepo: ClientPortalAccessRepository,
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async list(accountId: number) {
    return this.repo.findAllByAccount(accountId);
  }

  async create(
    accountId: number,
    createdByUserId: number,
    dto: CreateClientInviteDto,
  ) {
    const expiresAt =
      dto.expiresInHours && dto.expiresInHours > 0
        ? new Date(Date.now() + dto.expiresInHours * 3600_000)
        : null;
    return this.repo.create({
      accountId,
      createdByUserId,
      projectId: dto.projectId,
      note: dto.note,
      expiresAt,
      canViewProgress: dto.canViewProgress,
      canViewPhotos: dto.canViewPhotos,
      canViewDocuments: dto.canViewDocuments,
      canViewFinancials: dto.canViewFinancials,
    });
  }

  async revoke(accountId: number, token: string) {
    const inv = await this.repo.findByToken(token);
    if (!inv || inv.accountId !== accountId) {
      throw new NotFoundException('Invite not found');
    }
    if (inv.usedAt) {
      throw new BadRequestException('Invite already used');
    }
    await this.repo.deleteByTokenAndAccount(token, accountId);
    return { success: true };
  }

  async check(token: string) {
    const inv = await this.repo.findByToken(token);
    if (!inv) throw new NotFoundException('Invite not found');
    if (inv.usedAt) throw new GoneException('Invite already used');
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
      throw new GoneException('Invite expired');
    }
    return {
      valid: true,
      companyName: inv.companyName,
      projectName: inv.projectName,
      projectId: inv.projectId,
      note: inv.note,
    };
  }

  async accept(token: string, dto: AcceptClientInviteDto, authHeader?: string) {
    const inv = await this.repo.findByToken(token);
    if (!inv) throw new NotFoundException('Invite not found');
    if (inv.usedAt) throw new GoneException('Invite already used');
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
      throw new GoneException('Invite expired');
    }

    const login = dto.email.trim().toLowerCase();
    const existingByLogin = await (this.prisma as any).clientPortalAccess.findFirst({
      where: { login },
    });
    if (existingByLogin) {
      throw new ConflictException(`Login "${login}" already used`);
    }

    const fullName =
      dto.clientType === 'individual'
        ? [dto.lastName, dto.firstName, dto.middleName].filter(Boolean).join(' ') || login
        : dto.companyName || login;

    // 1. Create Client
    const client = await (this.prisma as any).client.create({
      data: {
        accountId: inv.accountId,
        clientType: dto.clientType,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        middleName: dto.middleName ?? null,
        companyName: dto.companyName ?? null,
        inn: dto.inn ?? null,
        email: dto.email,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        status: 'active',
        source: 'invite',
      },
    });

    // 2. Create User (roleId=15)
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await (this.prisma as any).user.create({
      data: {
        accountId: inv.accountId,
        roleId: CLIENT_ROLE_ID,
        name: fullName,
        email: login,
        passwordDigest: passwordHash,
        isActive: true,
        mustChangePassword: false,
      },
    });

    // 3. Create ClientPortalAccess
    const accessToken = crypto.randomBytes(32).toString('hex');
    const access = await this.portalRepo.create({
      clientId: client.id,
      projectId: inv.projectId,
      accessToken,
      login,
      passwordHash,
      userId: user.id,
      canViewProgress: inv.canViewProgress,
      canViewPhotos: inv.canViewPhotos,
      canViewDocuments: inv.canViewDocuments,
      canViewFinancials: inv.canViewFinancials,
      isActive: true,
    });

    // 4. Mark invite used
    await this.repo.markUsed(token, client.id, user.id);

    // 5. Optionally create chat
    if (inv.projectId) {
      await this.tryCreateClientChat(client, inv.projectId, user.id, authHeader);
    }

    return {
      success: true,
      clientId: client.id,
      userId: user.id,
      accessId: access.id,
      accessToken,
      login,
    };
  }

  private async tryCreateClientChat(
    client: any,
    projectId: number,
    clientUserId: number,
    authHeader?: string,
  ) {
    const chatUrl = this.config.get<string>('CHAT_SERVICE_URL');
    if (!chatUrl || !authHeader) return;
    try {
      const project = await (this.prisma as any).project
        .findUnique({ where: { id: projectId }, select: { name: true } })
        .catch(() => null);
      const channelName = `Клиент: ${client.companyName || [client.firstName, client.lastName].filter(Boolean).join(' ') || `#${client.id}`}${project?.name ? ` — ${project.name}` : ''}`;
      await firstValueFrom(
        this.http.post(
          `${chatUrl}/chat-channels`,
          {
            name: channelName,
            type: 'private',
            projectId,
            memberIds: [clientUserId],
          },
          { headers: { Authorization: authHeader } },
        ),
      );
    } catch (e: any) {
      this.logger.warn(`Failed to auto-create client chat: ${e?.message}`);
    }
  }
}
