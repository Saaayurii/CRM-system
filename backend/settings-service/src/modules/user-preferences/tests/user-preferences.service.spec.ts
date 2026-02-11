import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserPreferencesService } from '../user-preferences.service';
import { UserPreferencesRepository } from '../repositories/user-preferences.repository';

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;
  let repository: jest.Mocked<UserPreferencesRepository>;

  const mockPreferences = {
    id: 1,
    name: 'Test User',
    email: 'test@test.com',
    settings: { language: 'en' },
    notificationSettings: { email: true },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPreferencesService,
        {
          provide: UserPreferencesRepository,
          useValue: {
            findByUserId: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserPreferencesService>(UserPreferencesService);
    repository = module.get(UserPreferencesRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPreferences', () => {
    it('should return preferences for a valid user', async () => {
      repository.findByUserId.mockResolvedValue(mockPreferences);

      const result = await service.getPreferences(1);

      expect(result).toEqual(mockPreferences);
      expect(repository.findByUserId).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user is not found', async () => {
      repository.findByUserId.mockResolvedValue(null);

      await expect(service.getPreferences(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getPreferences(999)).rejects.toThrow(
        'User not found',
      );
    });

    it('should pass the correct userId to the repository', async () => {
      repository.findByUserId.mockResolvedValue(mockPreferences);

      await service.getPreferences(42);

      expect(repository.findByUserId).toHaveBeenCalledWith(42);
    });
  });

  describe('updatePreferences', () => {
    it('should update and return preferences', async () => {
      const dto = { settings: { language: 'fr' } };
      const updated = { ...mockPreferences, settings: { language: 'fr' } };
      repository.update.mockResolvedValue(updated);

      const result = await service.updatePreferences(1, dto as any);

      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith(1, dto);
    });

    it('should pass userId and dto correctly to repository', async () => {
      const dto = { notificationSettings: { email: false } };
      repository.update.mockResolvedValue({
        ...mockPreferences,
        notificationSettings: { email: false },
      });

      await service.updatePreferences(10, dto as any);

      expect(repository.update).toHaveBeenCalledWith(10, dto);
    });

    it('should propagate repository errors', async () => {
      repository.update.mockRejectedValue(new Error('DB error'));

      await expect(service.updatePreferences(1, {} as any)).rejects.toThrow(
        'DB error',
      );
    });
  });
});
