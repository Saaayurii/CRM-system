import { Injectable, NotFoundException } from '@nestjs/common';
import { UserPreferencesRepository } from './repositories/user-preferences.repository';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';

@Injectable()
export class UserPreferencesService {
  constructor(private readonly repo: UserPreferencesRepository) {}
  async getPreferences(userId: number) {
    const u = await this.repo.findByUserId(userId);
    if (!u) throw new NotFoundException('User not found');
    return u;
  }
  async updatePreferences(userId: number, dto: UpdateUserPreferencesDto) {
    return this.repo.update(userId, dto);
  }
}
