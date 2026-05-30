import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { MaterialRequestRepository } from './repositories/material-request.repository';
import { NotificationsClientService } from '../../common/notifications/notifications-client.service';
import {
  CreateMaterialRequestDto,
  UpdateMaterialRequestDto,
  CreateMaterialRequestItemDto,
} from './dto';

// Admins + PM + procurement + warehouse keeper
const MATERIALS_ROLES = [1, 2, 4, 6, 7];

@Injectable()
export class MaterialRequestsService {
  constructor(
    private readonly materialRequestRepository: MaterialRequestRepository,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    status?: number,
    projectId?: number,
  ): Promise<{
    materialRequests: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [materialRequests, total] = await Promise.all([
      this.materialRequestRepository.findAll(accountId, {
        skip,
        take: limit,
        status,
        projectId,
      }),
      this.materialRequestRepository.count(accountId, status),
    ]);

    return {
      materialRequests,
      total,
      page,
      limit,
    };
  }

  async findById(id: number, requestingUserAccountId: number) {
    const materialRequest = await this.materialRequestRepository.findById(id);
    if (!materialRequest) {
      throw new NotFoundException('Material request not found');
    }

    if (materialRequest.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return materialRequest;
  }

  async create(
    createDto: CreateMaterialRequestDto,
    requestingUserAccountId: number,
    actorUserId?: number,
  ) {
    createDto.accountId = requestingUserAccountId;

    const existing = await this.materialRequestRepository.findByRequestNumber(
      createDto.requestNumber,
    );
    if (existing) {
      throw new ConflictException(
        'Material request with this number already exists',
      );
    }

    const request = await this.materialRequestRepository.create(createDto);

    const isUrgent = (createDto.priority ?? 0) >= 3;
    void this.notificationsClient.broadcast({
      accountId: requestingUserAccountId,
      roleIds: MATERIALS_ROLES,
      excludeUserId: actorUserId,
      title: `${isUrgent ? 'Срочная заявка' : 'Новая заявка'} на материалы №${request.requestNumber}`,
      message: request.notes || undefined,
      notificationType: 'material_request_created',
      priority: isUrgent ? 3 : 2,
      channels: isUrgent ? ['in_app', 'push'] : ['in_app'],
      actionUrl: `/dashboard/warehouse/requests`,
      entityType: 'material_request',
      entityId: request.id,
    });

    return request;
  }

  async update(
    id: number,
    updateDto: UpdateMaterialRequestDto,
    requestingUserAccountId: number,
  ) {
    const materialRequest = await this.materialRequestRepository.findById(id);
    if (!materialRequest) {
      throw new NotFoundException('Material request not found');
    }

    if (materialRequest.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.materialRequestRepository.update(id, updateDto);
  }

  async remove(id: number, requestingUserAccountId: number): Promise<void> {
    const materialRequest = await this.materialRequestRepository.findById(id);
    if (!materialRequest) {
      throw new NotFoundException('Material request not found');
    }

    if (materialRequest.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    await this.materialRequestRepository.delete(id);
  }

  async addItem(
    materialRequestId: number,
    dto: CreateMaterialRequestItemDto,
    requestingUserAccountId: number,
  ) {
    const materialRequest =
      await this.materialRequestRepository.findById(materialRequestId);
    if (!materialRequest) {
      throw new NotFoundException('Material request not found');
    }

    if (materialRequest.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.materialRequestRepository.addItem(materialRequestId, dto);
  }
}
