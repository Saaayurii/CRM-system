import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { MaterialRepository } from './repositories/material.repository';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialResponseDto,
  CreateMaterialCategoryDto,
  UpdateMaterialCategoryDto,
  CreateMaterialAlternativeDto,
} from './dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly materialRepository: MaterialRepository) {}

  // Materials
  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    categoryId?: number,
  ): Promise<{
    materials: MaterialResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [materials, total] = await Promise.all([
      this.materialRepository.findAll(accountId, {
        skip,
        take: limit,
        categoryId,
      }),
      this.materialRepository.count(accountId, categoryId),
    ]);

    return {
      materials: materials.map(this.toResponseDto),
      total,
      page,
      limit,
    };
  }

  async findById(
    id: number,
    requestingUserAccountId: number,
  ): Promise<MaterialResponseDto> {
    const material = await this.materialRepository.findById(id);
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    if (material.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponseDto(material);
  }

  async create(
    createMaterialDto: CreateMaterialDto,
    requestingUserAccountId: number,
  ): Promise<MaterialResponseDto> {
    if (createMaterialDto.accountId !== requestingUserAccountId) {
      throw new ForbiddenException(
        'Cannot create materials in another account',
      );
    }

    if (createMaterialDto.code) {
      const existing = await this.materialRepository.findByCode(
        createMaterialDto.code,
      );
      if (existing) {
        throw new ConflictException('Material with this code already exists');
      }
    }

    const material = await this.materialRepository.create(createMaterialDto);
    return this.toResponseDto(material);
  }

  async update(
    id: number,
    updateMaterialDto: UpdateMaterialDto,
    requestingUserAccountId: number,
  ): Promise<MaterialResponseDto> {
    const material = await this.materialRepository.findById(id);
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    if (material.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    if (updateMaterialDto.code && updateMaterialDto.code !== material.code) {
      const existing = await this.materialRepository.findByCode(
        updateMaterialDto.code,
      );
      if (existing) {
        throw new ConflictException('Material with this code already exists');
      }
    }

    const updatedMaterial = await this.materialRepository.update(
      id,
      updateMaterialDto,
    );
    return this.toResponseDto(updatedMaterial);
  }

  async remove(id: number, requestingUserAccountId: number): Promise<void> {
    const material = await this.materialRepository.findById(id);
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    if (material.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    await this.materialRepository.softDelete(id);
  }

  // Material Categories
  async findAllCategories(
    accountId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    categories: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      this.materialRepository.findAllCategories(accountId, {
        skip,
        take: limit,
      }),
      this.materialRepository.countCategories(accountId),
    ]);

    return {
      categories,
      total,
      page,
      limit,
    };
  }

  async findCategoryById(id: number, requestingUserAccountId: number) {
    const category = await this.materialRepository.findCategoryById(id);
    if (!category) {
      throw new NotFoundException('Material category not found');
    }

    if (category.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return category;
  }

  async createCategory(
    createCategoryDto: CreateMaterialCategoryDto,
    requestingUserAccountId: number,
  ) {
    if (createCategoryDto.accountId !== requestingUserAccountId) {
      throw new ForbiddenException(
        'Cannot create categories in another account',
      );
    }

    return this.materialRepository.createCategory(createCategoryDto);
  }

  async updateCategory(
    id: number,
    updateCategoryDto: UpdateMaterialCategoryDto,
    requestingUserAccountId: number,
  ) {
    const category = await this.materialRepository.findCategoryById(id);
    if (!category) {
      throw new NotFoundException('Material category not found');
    }

    if (category.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.materialRepository.updateCategory(id, updateCategoryDto);
  }

  async removeCategory(
    id: number,
    requestingUserAccountId: number,
  ): Promise<void> {
    const category = await this.materialRepository.findCategoryById(id);
    if (!category) {
      throw new NotFoundException('Material category not found');
    }

    if (category.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    await this.materialRepository.deleteCategory(id);
  }

  // Material Alternatives
  async addAlternative(
    materialId: number,
    dto: CreateMaterialAlternativeDto,
    requestingUserAccountId: number,
  ) {
    const material = await this.materialRepository.findById(materialId);
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    if (material.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.materialRepository.addAlternative(
      materialId,
      dto.alternativeMaterialId,
      dto.notes,
    );
  }

  private toResponseDto(material: any): MaterialResponseDto {
    return {
      id: material.id,
      accountId: material.accountId,
      categoryId: material.categoryId,
      category: material.category,
      name: material.name,
      code: material.code,
      description: material.description,
      unit: material.unit,
      manufacturer: material.manufacturer,
      specifications: material.specifications,
      basePrice: material.basePrice ? Number(material.basePrice) : undefined,
      currency: material.currency,
      minStockLevel: material.minStockLevel
        ? Number(material.minStockLevel)
        : undefined,
      maxStockLevel: material.maxStockLevel
        ? Number(material.maxStockLevel)
        : undefined,
      reorderPoint: material.reorderPoint
        ? Number(material.reorderPoint)
        : undefined,
      photos: material.photos,
      documents: material.documents,
      barcode: material.barcode,
      qrCode: material.qrCode,
      isActive: material.isActive,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
    };
  }
}
