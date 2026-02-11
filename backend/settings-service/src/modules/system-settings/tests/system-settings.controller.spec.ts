import { Test, TestingModule } from '@nestjs/testing';
import { SystemSettingsController } from '../system-settings.controller';
import { SystemSettingsService } from '../system-settings.service';

describe('SystemSettingsController', () => {
  let controller: SystemSettingsController;
  let service: jest.Mocked<SystemSettingsService>;

  const mockSettings = {
    id: 1,
    name: 'Test Account',
    subdomain: 'test',
    settings: { theme: 'dark' },
    status: 'active',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemSettingsController],
      providers: [
        {
          provide: SystemSettingsService,
          useValue: {
            getSettings: jest.fn(),
            updateSettings: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SystemSettingsController>(SystemSettingsController);
    service = module.get(SystemSettingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return system settings for the account', async () => {
      service.getSettings.mockResolvedValue(mockSettings);

      const result = await controller.getSettings(1);

      expect(result).toEqual(mockSettings);
      expect(service.getSettings).toHaveBeenCalledWith(1);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getSettings.mockRejectedValue(new Error('Account not found'));

      await expect(controller.getSettings(999)).rejects.toThrow('Account not found');
    });
  });

  describe('updateSettings', () => {
    it('should update and return system settings', async () => {
      const dto = { name: 'Updated' } as any;
      const updated = { ...mockSettings, name: 'Updated' };
      service.updateSettings.mockResolvedValue(updated);

      const result = await controller.updateSettings(1, dto);

      expect(result).toEqual(updated);
      expect(service.updateSettings).toHaveBeenCalledWith(1, dto);
    });

    it('should pass accountId and dto to service correctly', async () => {
      const dto = { settings: { timezone: 'UTC' } } as any;
      service.updateSettings.mockResolvedValue({ ...mockSettings, settings: dto.settings });

      await controller.updateSettings(7, dto);

      expect(service.updateSettings).toHaveBeenCalledWith(7, dto);
    });
  });
});
