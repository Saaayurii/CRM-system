import { Test, TestingModule } from '@nestjs/testing';
import { DictionaryTypesController } from '../dictionary-types.controller';
import { DictionaryTypesService } from '../dictionary-types.service';

describe('DictionaryTypesController', () => {
  let controller: DictionaryTypesController;
  let service: jest.Mocked<DictionaryTypesService>;

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
      controllers: [DictionaryTypesController],
      providers: [
        {
          provide: DictionaryTypesService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DictionaryTypesController>(DictionaryTypesController);
    service = module.get(DictionaryTypesService);
  });

  describe('findAll', () => {
    it('should return all dictionary types', async () => {
      const types = [mockDictionaryType];
      service.findAll.mockResolvedValue(types);

      const result = await controller.findAll();

      expect(result).toEqual(types);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('should return a dictionary type by id', async () => {
      service.findById.mockResolvedValue(mockDictionaryType);

      const result = await controller.findById(1);

      expect(result).toEqual(mockDictionaryType);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new dictionary type', async () => {
      const createDto = { code: 'STATUS', name: 'Status', description: 'Status dictionary' };
      service.create.mockResolvedValue(mockDictionaryType);

      const result = await controller.create(createDto as any);

      expect(result).toEqual(mockDictionaryType);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a dictionary type', async () => {
      const updateDto = { name: 'Updated Status' };
      const updated = { ...mockDictionaryType, name: 'Updated Status' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(1, updateDto as any);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('delete', () => {
    it('should delete a dictionary type', async () => {
      service.delete.mockResolvedValue(mockDictionaryType as any);

      const result = await controller.delete(1);

      expect(result).toEqual(mockDictionaryType);
      expect(service.delete).toHaveBeenCalledWith(1);
    });
  });
});
