import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SafetyRepository } from './repositories/safety.repository';
import {
  CreateSafetyIncidentDto,
  UpdateSafetyIncidentDto,
  CreateSafetyTrainingDto,
  UpdateSafetyTrainingDto,
  CreateSafetyTrainingRecordDto,
} from './dto';

@Injectable()
export class SafetyService {
  constructor(private readonly repository: SafetyRepository) {}

  // ─── Safety Incidents ───────────────────────────────────────────────

  async findAllIncidents(accountId: number, page = 1, limit = 20) {
    if (!accountId) throw new BadRequestException('accountId is required');
    return this.repository.findAll(accountId, page, limit);
  }

  async findIncidentById(id: number, accountId: number) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const incident = await this.repository.findById(id, accountId);
    if (!incident) throw new NotFoundException(`Safety incident #${id} not found`);
    return incident;
  }

  async createIncident(accountId: number, dto: CreateSafetyIncidentDto) {
    if (!accountId) throw new BadRequestException('accountId is required');
    return this.repository.create(accountId, dto);
  }

  async updateIncident(id: number, accountId: number, dto: UpdateSafetyIncidentDto) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const incident = await this.repository.update(id, accountId, dto);
    if (!incident) throw new NotFoundException(`Safety incident #${id} not found`);
    return incident;
  }

  async deleteIncident(id: number, accountId: number) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const incident = await this.repository.delete(id, accountId);
    if (!incident) throw new NotFoundException(`Safety incident #${id} not found`);
    return incident;
  }

  // ─── Safety Trainings ──────────────────────────────────────────────

  async findAllTrainings(accountId: number, page = 1, limit = 20) {
    if (!accountId) throw new BadRequestException('accountId is required');
    return this.repository.findAllTrainings(accountId, page, limit);
  }

  async findTrainingById(id: number, accountId: number) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const training = await this.repository.findTrainingById(id, accountId);
    if (!training) throw new NotFoundException(`Safety training #${id} not found`);
    return training;
  }

  async createTraining(accountId: number, dto: CreateSafetyTrainingDto) {
    if (!accountId) throw new BadRequestException('accountId is required');
    return this.repository.createTraining(accountId, dto);
  }

  async updateTraining(id: number, accountId: number, dto: UpdateSafetyTrainingDto) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const training = await this.repository.updateTraining(id, accountId, dto);
    if (!training) throw new NotFoundException(`Safety training #${id} not found`);
    return training;
  }

  async deleteTraining(id: number, accountId: number) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const training = await this.repository.deleteTraining(id, accountId);
    if (!training) throw new NotFoundException(`Safety training #${id} not found`);
    return training;
  }

  // ─── Safety Training Records ───────────────────────────────────────

  async createTrainingRecord(dto: CreateSafetyTrainingRecordDto) {
    return this.repository.createRecord(dto);
  }
}
