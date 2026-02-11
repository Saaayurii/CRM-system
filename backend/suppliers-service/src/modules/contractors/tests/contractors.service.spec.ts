import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ContractorsService } from '../contractors.service';
import { ContractorRepository } from '../repositories/contractor.repository';

describe('ContractorsService', () => {
  let service: ContractorsService;
  let repository: jest.Mocked<ContractorRepository>;

  const now = new Date();
  const mockContractor = {
    id: 1,
    accountId: 1,
    name: 'Test Contractor',
    legalName: 'Test Contractor LLC',
    inn: '1234567890',
    kpp: '123456789',
    contactPerson: 'Jane',
    phone: '+7999',
    email: 'contractor@test.com',
    legalAddress: '789 St',
    specialization: ['plumbing'],
    rating: 4.0,
    reliabilityScore: 85,
    status: 1,
    isVerified: false,
    notes: null,
    documents: [],
    assignments: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractorsService,
        {
          provide: ContractorRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
            findAssignments: jest.fn(),
            createAssignment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContractorsService>(ContractorsService);
    repository = module.get(ContractorRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated contractors', async () => {
      repository.findAll.mockResolvedValue([mockContractor]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual({
        contractors: [mockContractor],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(repository.findAll).toHaveBeenCalledWith(1, { skip: 0, take: 20 });
    });
  });

  describe('findById', () => {
    it('should return a contractor by id', async () => {
      repository.findById.mockResolvedValue(mockContractor);

      const result = await service.findById(1, 1);

      expect(result).toEqual(mockContractor);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockContractor);

      await expect(service.findById(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create a contractor', async () => {
      const dto = { accountId: 1, name: 'New Contractor' } as any;
      repository.create.mockResolvedValue({ ...mockContractor, name: 'New Contractor' });

      const result = await service.create(dto, 1);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      const dto = { accountId: 2, name: 'New Contractor' } as any;

      await expect(service.create(dto, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update a contractor', async () => {
      const dto = { name: 'Updated' } as any;
      repository.findById.mockResolvedValue(mockContractor);
      repository.update.mockResolvedValue({ ...mockContractor, name: 'Updated' });

      const result = await service.update(1, dto, 1);

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, {} as any, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockContractor);

      await expect(service.update(1, {} as any, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should soft delete a contractor', async () => {
      repository.findById.mockResolvedValue(mockContractor);
      repository.softDelete.mockResolvedValue(undefined);

      await service.remove(1, 1);

      expect(repository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockContractor);

      await expect(service.remove(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAssignments', () => {
    it('should return contractor assignments', async () => {
      const mockAssignments = [{ id: 1, contractorId: 1, workType: 'plumbing' }];
      repository.findById.mockResolvedValue(mockContractor);
      repository.findAssignments.mockResolvedValue(mockAssignments);

      const result = await service.getAssignments(1, 1);

      expect(result).toEqual(mockAssignments);
      expect(repository.findAssignments).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when contractor not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getAssignments(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addAssignment', () => {
    it('should add an assignment to contractor', async () => {
      const dto = { projectId: 1, workType: 'electrical' } as any;
      repository.findById.mockResolvedValue(mockContractor);
      repository.createAssignment.mockResolvedValue({ id: 1, contractorId: 1, workType: 'electrical' });

      const result = await service.addAssignment(1, dto, 1);

      expect(result).toBeDefined();
      expect(repository.createAssignment).toHaveBeenCalledWith(1, dto);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockContractor);

      await expect(service.addAssignment(1, {} as any, 999)).rejects.toThrow(ForbiddenException);
    });
  });
});
