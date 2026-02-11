import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DictionaryTypesService } from '../dictionary-types.service';
import { DictionaryTypesRepository } from '../repositories/dictionary-types.repository';

describe('DictionaryTypesService', () => {
  let service: DictionaryTypesService;
  let repository: jest.Mocked<DictionaryTypesRepository>;

  const mockDictionaryType = {
    id: 1,
    code: 'STATUS',
    name: 'Status',
    description: 'Status dictionary',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DictionaryTypesService,
        {
          provide: DictionaryTypesRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByCode: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DictionaryTypesService>(DictionaryTypesService);
    repository = module.get(DictionaryTypesRepository);
  });

  describe('findAll', () => {
    it('should return all dictionary types', async () => {
      const types = [mockDictionaryType];
      repository.findAll.mockResolvedValue(types);

      const result = await service.findAll();

      expect(result).toEqual(types);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('should return a dictionary type by id', async () => {
      repository.findById.mockResolvedValue(mockDictionaryType);

      const result = await service.findById(1);

      expect(result).toEqual(mockDictionaryType);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when type not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = { code: 'STATUS', name: 'Status', description: 'Status dictionary' };

    it('should create a new dictionary type', async () => {
      repository.findByCode.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockDictionaryType);

      const result = await service.create(createDto as any);

      expect(result).toEqual(mockDictionaryType);
      expect(repository.findByCode).toHaveBeenCalledWith('STATUS');
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ConflictException when code already exists', async () => {
      repository.findByCode.mockResolvedValue(mockDictionaryType);

      await expect(service.create(createDto as any)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Status' };

    it('should update a dictionary type', async () => {
      const updated = { ...mockDictionaryType, name: 'Updated Status' };
      repository.findById.mockResolvedValue(mockDictionaryType);
      repository.update.mockResolvedValue(updated);

      const result = await service.update(1, updateDto as any);

      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when updating non-existent type', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, updateDto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating code to existing one', async () => {
      const updateWithCode = { code: 'EXISTING' };
      repository.findById.mockResolvedValue(mockDictionaryType);
      repository.findByCode.mockResolvedValue({ ...mockDictionaryType, id: 2 });

      await expect(service.update(1, updateWithCode as any)).rejects.toThrow(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a dictionary type', async () => {
      repository.findById.mockResolvedValue(mockDictionaryType);
      repository.delete.mockResolvedValue(mockDictionaryType);

      const result = await service.delete(1);

      expect(result).toEqual(mockDictionaryType);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when deleting non-existent type', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
