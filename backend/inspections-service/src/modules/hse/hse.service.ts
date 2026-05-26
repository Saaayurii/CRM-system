import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HseRepository } from './repositories/hse.repository';

function computeRiskLevel(likelihood: number, severity: number): string {
  const score = (likelihood || 0) * (severity || 0);
  if (score >= 16) return 'critical';
  if (score >= 9) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

@Injectable()
export class HseService {
  constructor(private readonly repo: HseRepository) {}

  dashboardSummary(accountId: number) {
    return this.repo.dashboardSummary(accountId);
  }

  // ─── Risks ─────────────────────────────────────────────────────

  risksFindAll(
    accountId: number,
    filters: {
      page: number;
      limit: number;
      status?: string;
      projectId?: number;
    },
  ) {
    return this.repo.findAll('hseRisk', accountId, filters);
  }

  async risksFindOne(id: number, accountId: number) {
    const item = await this.repo.findById('hseRisk', id, accountId);
    if (!item) throw new NotFoundException(`Risk #${id} not found`);
    return item;
  }

  risksCreate(accountId: number, dto: any, userId?: number) {
    const data = {
      ...dto,
      createdByUserId: userId ?? null,
      riskLevel:
        dto.riskLevel ?? computeRiskLevel(dto.likelihood ?? 1, dto.severity ?? 1),
      identifiedAt: dto.identifiedAt ? new Date(dto.identifiedAt) : undefined,
      reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
    };
    return this.repo.create('hseRisk', accountId, data);
  }

  async risksUpdate(id: number, accountId: number, dto: any) {
    await this.risksFindOne(id, accountId);
    const data = { ...dto };
    if (dto.likelihood !== undefined || dto.severity !== undefined) {
      const existing = await this.risksFindOne(id, accountId);
      data.riskLevel = computeRiskLevel(
        dto.likelihood ?? existing.likelihood,
        dto.severity ?? existing.severity,
      );
    }
    if (dto.identifiedAt !== undefined) {
      data.identifiedAt = dto.identifiedAt ? new Date(dto.identifiedAt) : null;
    }
    if (dto.reviewDate !== undefined) {
      data.reviewDate = dto.reviewDate ? new Date(dto.reviewDate) : null;
    }
    return this.repo.update('hseRisk', id, accountId, data);
  }

  async risksDelete(id: number, accountId: number) {
    await this.risksFindOne(id, accountId);
    await this.repo.softDelete('hseRisk', id, accountId);
    return { ok: true, id };
  }

  // ─── Incidents ─────────────────────────────────────────────────

  incidentsFindAll(
    accountId: number,
    filters: {
      page: number;
      limit: number;
      status?: string;
      projectId?: number;
    },
  ) {
    return this.repo.findAll('hseIncident', accountId, filters);
  }

  async incidentsFindOne(id: number, accountId: number) {
    const item = await this.repo.findById('hseIncident', id, accountId);
    if (!item) throw new NotFoundException(`Incident #${id} not found`);
    return item;
  }

  incidentsCreate(accountId: number, dto: any, userId?: number) {
    if (!dto.occurredAt) {
      throw new BadRequestException('occurredAt is required');
    }
    if (!dto.description) {
      throw new BadRequestException('description is required');
    }
    if (!dto.incidentType) {
      throw new BadRequestException('incidentType is required');
    }
    return this.repo.create('hseIncident', accountId, {
      ...dto,
      reportedByUserId: dto.reportedByUserId ?? userId ?? null,
      occurredAt: new Date(dto.occurredAt),
    });
  }

  async incidentsUpdate(id: number, accountId: number, dto: any) {
    await this.incidentsFindOne(id, accountId);
    const data = { ...dto };
    if (dto.occurredAt !== undefined) {
      data.occurredAt = new Date(dto.occurredAt);
    }
    return this.repo.update('hseIncident', id, accountId, data);
  }

  async incidentsDelete(id: number, accountId: number) {
    await this.incidentsFindOne(id, accountId);
    await this.repo.softDelete('hseIncident', id, accountId);
    return { ok: true, id };
  }

  // ─── Permits ───────────────────────────────────────────────────

  permitsFindAll(
    accountId: number,
    filters: {
      page: number;
      limit: number;
      status?: string;
      projectId?: number;
    },
  ) {
    return this.repo.findAll('hsePermit', accountId, filters);
  }

  async permitsFindOne(id: number, accountId: number) {
    const item = await this.repo.findById('hsePermit', id, accountId);
    if (!item) throw new NotFoundException(`Permit #${id} not found`);
    return item;
  }

  permitsCreate(accountId: number, dto: any, userId?: number) {
    if (!dto.permitType) {
      throw new BadRequestException('permitType is required');
    }
    if (!dto.workDescription) {
      throw new BadRequestException('workDescription is required');
    }
    if (!dto.validFrom || !dto.validUntil) {
      throw new BadRequestException('validFrom and validUntil are required');
    }
    return this.repo.create('hsePermit', accountId, {
      ...dto,
      requestedByUserId: dto.requestedByUserId ?? userId ?? null,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
    });
  }

  async permitsUpdate(id: number, accountId: number, dto: any) {
    await this.permitsFindOne(id, accountId);
    const data = { ...dto };
    if (dto.validFrom !== undefined) data.validFrom = new Date(dto.validFrom);
    if (dto.validUntil !== undefined)
      data.validUntil = new Date(dto.validUntil);
    if (dto.approvedAt !== undefined)
      data.approvedAt = dto.approvedAt ? new Date(dto.approvedAt) : null;
    if (dto.closedAt !== undefined)
      data.closedAt = dto.closedAt ? new Date(dto.closedAt) : null;
    return this.repo.update('hsePermit', id, accountId, data);
  }

  async permitsApprove(id: number, accountId: number, userId: number) {
    await this.permitsFindOne(id, accountId);
    return this.repo.update('hsePermit', id, accountId, {
      status: 'approved',
      approvedByUserId: userId,
      approvedAt: new Date(),
    });
  }

  async permitsClose(id: number, accountId: number, closingNotes?: string) {
    await this.permitsFindOne(id, accountId);
    return this.repo.update('hsePermit', id, accountId, {
      status: 'completed',
      closedAt: new Date(),
      closingNotes: closingNotes ?? null,
    });
  }

  async permitsDelete(id: number, accountId: number) {
    await this.permitsFindOne(id, accountId);
    await this.repo.softDelete('hsePermit', id, accountId);
    return { ok: true, id };
  }

  // ─── Violations ────────────────────────────────────────────────

  violationsFindAll(
    accountId: number,
    filters: {
      page: number;
      limit: number;
      status?: string;
      projectId?: number;
    },
  ) {
    return this.repo.findAll('hseViolation', accountId, filters);
  }

  async violationsFindOne(id: number, accountId: number) {
    const item = await this.repo.findById('hseViolation', id, accountId);
    if (!item) throw new NotFoundException(`Violation #${id} not found`);
    return item;
  }

  violationsCreate(accountId: number, dto: any, userId?: number) {
    if (!dto.description) {
      throw new BadRequestException('description is required');
    }
    if (!dto.observedAt) {
      throw new BadRequestException('observedAt is required');
    }
    return this.repo.create('hseViolation', accountId, {
      ...dto,
      observedByUserId: dto.observedByUserId ?? userId ?? null,
      observedAt: new Date(dto.observedAt),
      deadline: dto.deadline ? new Date(dto.deadline) : null,
    });
  }

  async violationsUpdate(id: number, accountId: number, dto: any) {
    await this.violationsFindOne(id, accountId);
    const data = { ...dto };
    if (dto.observedAt !== undefined) data.observedAt = new Date(dto.observedAt);
    if (dto.deadline !== undefined)
      data.deadline = dto.deadline ? new Date(dto.deadline) : null;
    if (dto.resolvedAt !== undefined)
      data.resolvedAt = dto.resolvedAt ? new Date(dto.resolvedAt) : null;
    return this.repo.update('hseViolation', id, accountId, data);
  }

  async violationsResolve(
    id: number,
    accountId: number,
    resolutionNotes?: string,
  ) {
    await this.violationsFindOne(id, accountId);
    return this.repo.update('hseViolation', id, accountId, {
      status: 'corrected',
      resolvedAt: new Date(),
      resolutionNotes: resolutionNotes ?? null,
    });
  }

  async violationsDelete(id: number, accountId: number) {
    await this.violationsFindOne(id, accountId);
    await this.repo.softDelete('hseViolation', id, accountId);
    return { ok: true, id };
  }

  // ─── Corrective Actions ────────────────────────────────────────

  actionsFindAll(
    accountId: number,
    filters: {
      page: number;
      limit: number;
      status?: string;
      projectId?: number;
    },
  ) {
    return this.repo.findAll('hseCorrectiveAction', accountId, filters);
  }

  async actionsFindOne(id: number, accountId: number) {
    const item = await this.repo.findById(
      'hseCorrectiveAction',
      id,
      accountId,
    );
    if (!item) throw new NotFoundException(`Corrective action #${id} not found`);
    return item;
  }

  actionsCreate(accountId: number, dto: any, userId?: number) {
    if (!dto.title) {
      throw new BadRequestException('title is required');
    }
    return this.repo.create('hseCorrectiveAction', accountId, {
      ...dto,
      assignedByUserId: dto.assignedByUserId ?? userId ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });
  }

  async actionsUpdate(id: number, accountId: number, dto: any) {
    await this.actionsFindOne(id, accountId);
    const data = { ...dto };
    if (dto.dueDate !== undefined)
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.completedAt !== undefined)
      data.completedAt = dto.completedAt ? new Date(dto.completedAt) : null;
    return this.repo.update('hseCorrectiveAction', id, accountId, data);
  }

  async actionsComplete(
    id: number,
    accountId: number,
    completionNotes?: string,
  ) {
    await this.actionsFindOne(id, accountId);
    return this.repo.update('hseCorrectiveAction', id, accountId, {
      status: 'completed',
      completedAt: new Date(),
      completionNotes: completionNotes ?? null,
    });
  }

  async actionsDelete(id: number, accountId: number) {
    await this.actionsFindOne(id, accountId);
    await this.repo.softDelete('hseCorrectiveAction', id, accountId);
    return { ok: true, id };
  }

  // ─── Monitoring ────────────────────────────────────────────────

  monitoringFindAll(
    accountId: number,
    filters: {
      page: number;
      limit: number;
      status?: string;
      projectId?: number;
    },
  ) {
    return this.repo.findAll('hseMonitoring', accountId, {
      ...filters,
      orderBy: { measuredAt: 'desc' },
    });
  }

  async monitoringFindOne(id: number, accountId: number) {
    const item = await this.repo.findById('hseMonitoring', id, accountId);
    if (!item) throw new NotFoundException(`Monitoring #${id} not found`);
    return item;
  }

  monitoringCreate(accountId: number, dto: any, userId?: number) {
    if (!dto.parameterType) {
      throw new BadRequestException('parameterType is required');
    }
    if (!dto.measuredAt) {
      throw new BadRequestException('measuredAt is required');
    }
    // auto-compute status based on thresholds
    let status = dto.status;
    if (!status && dto.value !== undefined && dto.value !== null) {
      const v = Number(dto.value);
      const min = dto.thresholdMin !== undefined ? Number(dto.thresholdMin) : null;
      const max = dto.thresholdMax !== undefined ? Number(dto.thresholdMax) : null;
      if ((min !== null && v < min) || (max !== null && v > max)) {
        status = 'critical';
      } else {
        status = 'normal';
      }
    }
    return this.repo.create('hseMonitoring', accountId, {
      ...dto,
      status: status ?? 'normal',
      measuredByUserId: dto.measuredByUserId ?? userId ?? null,
      measuredAt: new Date(dto.measuredAt),
    });
  }

  async monitoringUpdate(id: number, accountId: number, dto: any) {
    await this.monitoringFindOne(id, accountId);
    const data = { ...dto };
    if (dto.measuredAt !== undefined) data.measuredAt = new Date(dto.measuredAt);
    return this.repo.update('hseMonitoring', id, accountId, data);
  }

  async monitoringDelete(id: number, accountId: number) {
    await this.monitoringFindOne(id, accountId);
    await this.repo.softDelete('hseMonitoring', id, accountId);
    return { ok: true, id };
  }
}
