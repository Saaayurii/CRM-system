import { Test, TestingModule } from '@nestjs/testing';
import { UserPreferencesController } from '../user-preferences.controller';
import { UserPreferencesService } from '../user-preferences.service';

describe('UserPreferencesController', () => {
  let controller: UserPreferencesController;
  let service: jest.Mocked<UserPreferencesService>;

  const mockPreferences = {
    id: 1,
    name: 'Test User',
    email: 'test@test.com',
    settings: { language: 'en' },
    notificationSettings: { email: true },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPreferencesController],
      providers: [
        {
          provide: UserPreferencesService,
          useValue: {
            getPreferences: jest.fn(),
            updatePreferences: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserPreferencesController>(UserPreferencesController);
    service = module.get(UserPreferencesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      service.getPreferences.mockResolvedValue(mockPreferences);

      const result = await controller.getPreferences(1);

      expect(result).toEqual(mockPreferences);
      expect(service.getPreferences).toHaveBeenCalledWith(1);
    });

    it('should propagate NotFoundException from service', async () => {
      service.getPreferences.mockRejectedValue(new Error('User not found'));

      await expect(controller.getPreferences(999)).rejects.toThrow('User not found');
    });
  });

  describe('updatePreferences', () => {
    it('should update and return user preferences', async () => {
      const dto = { settings: { language: 'de' } } as any;
      const updated = { ...mockPreferences, settings: { language: 'de' } };
      service.updatePreferences.mockResolvedValue(updated);

      const result = await controller.updatePreferences(1, dto);

      expect(result).toEqual(updated);
      expect(service.updatePreferences).toHaveBeenCalledWith(1, dto);
    });

    it('should pass userId and dto to service correctly', async () => {
      const dto = { notificationSettings: { sms: true } } as any;
      service.updatePreferences.mockResolvedValue({ ...mockPreferences });

      await controller.updatePreferences(5, dto);

      expect(service.updatePreferences).toHaveBeenCalledWith(5, dto);
    });
  });
});
