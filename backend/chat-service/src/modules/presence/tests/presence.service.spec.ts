import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PresenceService } from '../presence.service';

describe('PresenceService', () => {
  let service: PresenceService;

  const mockRedis = {
    sadd: jest.fn(),
    srem: jest.fn(),
    scard: jest.fn(),
    del: jest.fn(),
    zadd: jest.fn(),
    zrem: jest.fn(),
    zscore: jest.fn(),
    zrangebyscore: jest.fn(),
    pipeline: jest.fn(),
    disconnect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'redis.host') return 'localhost';
              if (key === 'redis.port') return 6379;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);

    // Inject mock Redis client directly
    (service as any).redis = mockRedis;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setUserOnline', () => {
    it('should add socket to user set and mark user as online', async () => {
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.zadd.mockResolvedValue(1);

      await service.setUserOnline(10, 'socket-abc');

      expect(mockRedis.sadd).toHaveBeenCalledWith(
        'presence:user:10',
        'socket-abc',
      );
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'presence:online',
        expect.any(String),
        '10',
      );
    });
  });

  describe('removeConnection', () => {
    it('should remove socket and return true if user still has other connections', async () => {
      mockRedis.srem.mockResolvedValue(1);
      mockRedis.scard.mockResolvedValue(2);

      const result = await service.removeConnection(10, 'socket-abc');

      expect(result).toBe(true);
      expect(mockRedis.srem).toHaveBeenCalledWith(
        'presence:user:10',
        'socket-abc',
      );
    });

    it('should set user offline and return false if no connections remain', async () => {
      mockRedis.srem.mockResolvedValue(1);
      mockRedis.scard.mockResolvedValue(0);
      mockRedis.del.mockResolvedValue(1);
      mockRedis.zrem.mockResolvedValue(1);

      const result = await service.removeConnection(10, 'socket-abc');

      expect(result).toBe(false);
      expect(mockRedis.del).toHaveBeenCalledWith('presence:user:10');
      expect(mockRedis.zrem).toHaveBeenCalledWith('presence:online', '10');
    });
  });

  describe('setUserOffline', () => {
    it('should remove user presence data from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRedis.zrem.mockResolvedValue(1);

      await service.setUserOffline(10);

      expect(mockRedis.del).toHaveBeenCalledWith('presence:user:10');
      expect(mockRedis.zrem).toHaveBeenCalledWith('presence:online', '10');
    });
  });

  describe('isUserOnline', () => {
    it('should return true if user is online', async () => {
      mockRedis.zscore.mockResolvedValue('1700000000');

      const result = await service.isUserOnline(10);

      expect(result).toBe(true);
    });

    it('should return false if user is offline', async () => {
      mockRedis.zscore.mockResolvedValue(null);

      const result = await service.isUserOnline(10);

      expect(result).toBe(false);
    });
  });

  describe('getOnlineUsers', () => {
    it('should return online status for given user IDs', async () => {
      const mockPipeline = {
        zscore: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, '1700000000'],
          [null, null],
          [null, '1700000001'],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getOnlineUsers([1, 2, 3]);

      expect(result).toEqual({ 1: true, 2: false, 3: true });
    });

    it('should return empty object for empty input', async () => {
      const result = await service.getOnlineUsers([]);

      expect(result).toEqual({});
    });
  });

  describe('getOnlineUserIds', () => {
    it('should return all online user IDs', async () => {
      mockRedis.zrangebyscore.mockResolvedValue(['10', '20', '30']);

      const result = await service.getOnlineUserIds();

      expect(result).toEqual([10, 20, 30]);
    });

    it('should return empty array when no users are online', async () => {
      mockRedis.zrangebyscore.mockResolvedValue([]);

      const result = await service.getOnlineUserIds();

      expect(result).toEqual([]);
    });
  });

  describe('getRedisClient', () => {
    it('should return the Redis client instance', () => {
      const client = service.getRedisClient();

      expect(client).toBe(mockRedis);
    });
  });
});
