import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupplierRepository } from './repositories/supplier.repository';
import { CreateSupplierDto, UpdateSupplierDto, CreateSupplierMaterialDto, SupplierResponseDto } from './dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    status?: number,
  ): Promise<{ suppliers: SupplierResponseDto[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [suppliers, total] = await Promise.all([
      this.supplierRepository.findAll(accountId, { skip, take: limit, status }),
      this.supplierRepository.count(accountId, status),
    ]);

    return {
      suppliers: suppliers.map(this.toResponseDto),
      total,
      page,
      limit,
    };
  }

  async findById(id: number, requestingUserAccountId: number): Promise<SupplierResponseDto> {
    const supplier = await this.supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (supplier.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponseDto(supplier);
  }

  async create(
    createSupplierDto: CreateSupplierDto,
    requestingUserAccountId: number,
  ): Promise<SupplierResponseDto> {
    if (createSupplierDto.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Cannot create suppliers in another account');
    }

    const supplier = await this.supplierRepository.create(createSupplierDto);
    return this.toResponseDto(supplier);
  }

  async update(
    id: number,
    updateSupplierDto: UpdateSupplierDto,
    requestingUserAccountId: number,
  ): Promise<SupplierResponseDto> {
    const supplier = await this.supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (supplier.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    const updatedSupplier = await this.supplierRepository.update(id, updateSupplierDto);
    return this.toResponseDto(updatedSupplier);
  }

  async remove(id: number, requestingUserAccountId: number): Promise<void> {
    const supplier = await this.supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (supplier.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    await this.supplierRepository.softDelete(id);
  }

  async getMaterials(supplierId: number, requestingUserAccountId: number) {
    const supplier = await this.supplierRepository.findById(supplierId);
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (supplier.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.supplierRepository.findMaterials(supplierId);
  }

  async addMaterial(
    supplierId: number,
    createMaterialDto: CreateSupplierMaterialDto,
    requestingUserAccountId: number,
  ) {
    const supplier = await this.supplierRepository.findById(supplierId);
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (supplier.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.supplierRepository.createMaterial(supplierId, createMaterialDto);
  }

  private toResponseDto(supplier: any): SupplierResponseDto {
    return {
      id: supplier.id,
      accountId: supplier.accountId,
      name: supplier.name,
      legalName: supplier.legalName,
      inn: supplier.inn,
      kpp: supplier.kpp,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      website: supplier.website,
      legalAddress: supplier.legalAddress,
      warehouseAddress: supplier.warehouseAddress,
      paymentTerms: supplier.paymentTerms,
      deliveryTimeDays: supplier.deliveryTimeDays,
      minOrderAmount: supplier.minOrderAmount ? Number(supplier.minOrderAmount) : undefined,
      rating: supplier.rating ? Number(supplier.rating) : undefined,
      reliabilityScore: supplier.reliabilityScore,
      status: supplier.status,
      isVerified: supplier.isVerified,
      notes: supplier.notes,
      documents: supplier.documents,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }
}
