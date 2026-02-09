import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { MaterialRequestRepository } from './repositories/material-request.repository';
import {
  CreateMaterialRequestDto,
  UpdateMaterialRequestDto,
  CreateMaterialRequestItemDto,
} from './dto';

@Injectable()
export class MaterialRequestsService {
  constructor(private readonly materialRequestRepository: MaterialRequestRepository) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    status?: number,
  ): Promise<{ materialRequests: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [materialRequests, total] = await Promise.all([
      this.materialRequestRepository.findAll(accountId, { skip, take: limit, status }),
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
  ) {
    if (createDto.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Cannot create material requests in another account');
    }

    const existing = await this.materialRequestRepository.findByRequestNumber(createDto.requestNumber);
    if (existing) {
      throw new ConflictException('Material request with this number already exists');
    }

    return this.materialRequestRepository.create(createDto);
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
    const materialRequest = await this.materialRequestRepository.findById(materialRequestId);
    if (!materialRequest) {
      throw new NotFoundException('Material request not found');
    }

    if (materialRequest.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.materialRequestRepository.addItem(materialRequestId, dto);
  }
}
