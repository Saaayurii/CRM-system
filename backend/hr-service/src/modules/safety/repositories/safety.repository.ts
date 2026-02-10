import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateSafetyIncidentDto,
  UpdateSafetyIncidentDto,
  CreateSafetyTrainingDto,
  UpdateSafetyTrainingDto,
  CreateSafetyTrainingRecordDto,
} from '../dto';

@Injectable()
export class SafetyRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Safety Incidents ───────────────────────────────────────────────

  async findAll(accountId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).safetyIncident.findMany({
        where: { accountId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).safetyIncident.count({ where: { accountId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).safetyIncident.findFirst({
      where: { id, accountId },
    });
  }

  async create(accountId: number, dto: CreateSafetyIncidentDto) {
    return (this.prisma as any).safetyIncident.create({
      data: {
        accountId,
        projectId: dto.projectId ?? null,
        constructionSiteId: dto.constructionSiteId ?? null,
        incidentNumber: dto.incidentNumber,
        incidentType: dto.incidentType ?? null,
        severity: dto.severity ?? null,
        incidentDate: new Date(dto.incidentDate),
        locationDescription: dto.locationDescription ?? null,
        description: dto.description,
        affectedUsers: dto.affectedUsers ?? [],
        rootCause: dto.rootCause ?? null,
        contributingFactors: dto.contributingFactors ?? [],
        immediateActions: dto.immediateActions ?? null,
        correctiveActions: dto.correctiveActions ?? null,
        preventiveActions: dto.preventiveActions ?? null,
        reportedByUserId: dto.reportedByUserId ?? null,
        investigatedByUserId: dto.investigatedByUserId ?? null,
        status: dto.status ?? 0,
        photos: dto.photos ?? [],
        documents: dto.documents ?? [],
      },
    });
  }

  async update(id: number, accountId: number, dto: UpdateSafetyIncidentDto) {
    const record = await this.findById(id, accountId);
    if (!record) return null;
    return (this.prisma as any).safetyIncident.update({
      where: { id },
      data: {
        ...(dto.projectId !== undefined && { projectId: dto.projectId }),
        ...(dto.constructionSiteId !== undefined && { constructionSiteId: dto.constructionSiteId }),
        ...(dto.incidentNumber !== undefined && { incidentNumber: dto.incidentNumber }),
        ...(dto.incidentType !== undefined && { incidentType: dto.incidentType }),
        ...(dto.severity !== undefined && { severity: dto.severity }),
        ...(dto.incidentDate !== undefined && { incidentDate: new Date(dto.incidentDate) }),
        ...(dto.locationDescription !== undefined && { locationDescription: dto.locationDescription }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.affectedUsers !== undefined && { affectedUsers: dto.affectedUsers }),
        ...(dto.rootCause !== undefined && { rootCause: dto.rootCause }),
        ...(dto.contributingFactors !== undefined && { contributingFactors: dto.contributingFactors }),
        ...(dto.immediateActions !== undefined && { immediateActions: dto.immediateActions }),
        ...(dto.correctiveActions !== undefined && { correctiveActions: dto.correctiveActions }),
        ...(dto.preventiveActions !== undefined && { preventiveActions: dto.preventiveActions }),
        ...(dto.reportedByUserId !== undefined && { reportedByUserId: dto.reportedByUserId }),
        ...(dto.investigatedByUserId !== undefined && { investigatedByUserId: dto.investigatedByUserId }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.photos !== undefined && { photos: dto.photos }),
        ...(dto.documents !== undefined && { documents: dto.documents }),
      },
    });
  }

  async delete(id: number, accountId: number) {
    const record = await this.findById(id, accountId);
    if (!record) return null;
    return (this.prisma as any).safetyIncident.delete({ where: { id } });
  }

  async count(accountId: number) {
    return (this.prisma as any).safetyIncident.count({ where: { accountId } });
  }

  // ─── Safety Trainings ──────────────────────────────────────────────

  async findAllTrainings(accountId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).safetyTraining.findMany({
        where: { accountId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).safetyTraining.count({ where: { accountId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findTrainingById(id: number, accountId: number) {
    return (this.prisma as any).safetyTraining.findFirst({
      where: { id, accountId },
    });
  }

  async createTraining(accountId: number, dto: CreateSafetyTrainingDto) {
    return (this.prisma as any).safetyTraining.create({
      data: {
        accountId,
        trainingName: dto.trainingName,
        trainingType: dto.trainingType ?? null,
        description: dto.description ?? null,
        durationHours: dto.durationHours ?? null,
        validityMonths: dto.validityMonths ?? null,
        isMandatory: dto.isMandatory ?? true,
        materials: dto.materials ?? [],
      },
    });
  }

  async updateTraining(id: number, accountId: number, dto: UpdateSafetyTrainingDto) {
    const record = await this.findTrainingById(id, accountId);
    if (!record) return null;
    return (this.prisma as any).safetyTraining.update({
      where: { id },
      data: {
        ...(dto.trainingName !== undefined && { trainingName: dto.trainingName }),
        ...(dto.trainingType !== undefined && { trainingType: dto.trainingType }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.durationHours !== undefined && { durationHours: dto.durationHours }),
        ...(dto.validityMonths !== undefined && { validityMonths: dto.validityMonths }),
        ...(dto.isMandatory !== undefined && { isMandatory: dto.isMandatory }),
        ...(dto.materials !== undefined && { materials: dto.materials }),
      },
    });
  }

  async deleteTraining(id: number, accountId: number) {
    const record = await this.findTrainingById(id, accountId);
    if (!record) return null;
    return (this.prisma as any).safetyTraining.delete({ where: { id } });
  }

  async countTrainings(accountId: number) {
    return (this.prisma as any).safetyTraining.count({ where: { accountId } });
  }

  // ─── Safety Training Records ───────────────────────────────────────

  async createRecord(dto: CreateSafetyTrainingRecordDto) {
    return (this.prisma as any).safetyTrainingRecord.create({
      data: {
        userId: dto.userId,
        safetyTrainingId: dto.safetyTrainingId ?? null,
        trainingDate: new Date(dto.trainingDate),
        trainerId: dto.trainerId ?? null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        score: dto.score ?? null,
        passed: dto.passed ?? null,
        certificateNumber: dto.certificateNumber ?? null,
        certificateUrl: dto.certificateUrl ?? null,
        notes: dto.notes ?? null,
      },
    });
  }
}
