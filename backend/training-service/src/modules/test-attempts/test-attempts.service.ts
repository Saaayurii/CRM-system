import { Injectable, NotFoundException } from '@nestjs/common';
import { TestAttemptRepository } from './repositories/test-attempt.repository';
import { CreateTestAttemptDto } from './dto/create-test-attempt.dto';

@Injectable()
export class TestAttemptsService {
  constructor(private readonly repo: TestAttemptRepository) {}
  async findAll(page: number, limit: number, ktId?: number, userId?: number) {
    return this.repo.findAll(page, limit, ktId, userId);
  }
  async findById(id: number) {
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundException(`Test attempt #${id} not found`);
    return a;
  }
  async create(dto: CreateTestAttemptDto) {
    return this.repo.create(dto);
  }
}
