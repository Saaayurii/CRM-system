import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SystemSettingsService } from '../system-settings.service';
import { SystemSettingsRepository } from '../repositories/system-settings.repository';

describe('SystemSettingsService', () => {
  let service: SystemSettingsService;
  let repository: jest.Mocked<SystemSettingsRepository>;

  const mockSettings = {
    id: 1,
    name: 'Test Account',
    subdomain: 'test',
    settings: { theme: 'dark' },
    status: 'active',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemSettingsService,
        {
          provide: SystemSettingsRepository,
          useValue: {
            findByAccountId: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SystemSettingsService>(SystemSettingsService);
    repository = module.get(SystemSettingsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return settings for a valid account', async () => {
      repository.findByAccountId.mockResolvedValue(mockSettings);

      const result = await service.getSettings(1);

      expect(result).toEqual(mockSettings);
      expect(repository.findByAccountId).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when account is not found', async () => {
      repository.findByAccountId.mockResolvedValue(null);

      await expect(service.getSettings(999)).rejects.toThrow(NotFoundException);
      await expect(service.getSettings(999)).rejects.toThrow(
        'Account not found',
      );
    });

    it('should pass the correct accountId to the repository', async () => {
      repository.findByAccountId.mockResolvedValue(mockSettings);

      await service.getSettings(42);

      expect(repository.findByAccountId).toHaveBeenCalledWith(42);
    });
  });

  describe('updateSettings', () => {
    it('should update and return the updated settings', async () => {
      const dto = { name: 'Updated Account' };
      const updatedSettings = { ...mockSettings, name: 'Updated Account' };
      repository.update.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings(1, dto as any);

      expect(result).toEqual(updatedSettings);
      expect(repository.update).toHaveBeenCalledWith(1, dto);
    });

    it('should pass accountId and dto correctly to repository', async () => {
      const dto = { settings: { theme: 'light' } };
      repository.update.mockResolvedValue({
        ...mockSettings,
        settings: dto.settings,
      });

      await service.updateSettings(5, dto as any);

      expect(repository.update).toHaveBeenCalledWith(5, dto);
    });

    it('should propagate repository errors', async () => {
      repository.update.mockRejectedValue(new Error('DB error'));

      await expect(service.updateSettings(1, {} as any)).rejects.toThrow(
        'DB error',
      );
    });
  });
});
