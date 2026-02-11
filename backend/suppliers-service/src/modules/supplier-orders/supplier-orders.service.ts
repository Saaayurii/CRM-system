import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupplierOrderRepository } from './repositories/supplier-order.repository';
import {
  CreateSupplierOrderDto,
  UpdateSupplierOrderDto,
  CreateSupplierOrderItemDto,
} from './dto';

@Injectable()
export class SupplierOrdersService {
  constructor(
    private readonly supplierOrderRepository: SupplierOrderRepository,
  ) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    status?: number,
  ): Promise<{ orders: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.supplierOrderRepository.findAll(accountId, {
        skip,
        take: limit,
        status,
      }),
      this.supplierOrderRepository.count(accountId, status),
    ]);

    return {
      orders,
      total,
      page,
      limit,
    };
  }

  async findById(id: number, requestingUserAccountId: number) {
    const order = await this.supplierOrderRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }

    if (order.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async create(
    createSupplierOrderDto: CreateSupplierOrderDto,
    requestingUserAccountId: number,
  ) {
    if (createSupplierOrderDto.accountId !== requestingUserAccountId) {
      throw new ForbiddenException(
        'Cannot create supplier orders in another account',
      );
    }

    return this.supplierOrderRepository.create(createSupplierOrderDto);
  }

  async update(
    id: number,
    updateSupplierOrderDto: UpdateSupplierOrderDto,
    requestingUserAccountId: number,
  ) {
    const order = await this.supplierOrderRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }

    if (order.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.supplierOrderRepository.update(id, updateSupplierOrderDto);
  }

  async remove(id: number, requestingUserAccountId: number): Promise<void> {
    const order = await this.supplierOrderRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }

    if (order.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    await this.supplierOrderRepository.softDelete(id);
  }

  async addItem(
    orderId: number,
    createItemDto: CreateSupplierOrderItemDto,
    requestingUserAccountId: number,
  ) {
    const order = await this.supplierOrderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }

    if (order.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.supplierOrderRepository.createItem(orderId, createItemDto);
  }
}
