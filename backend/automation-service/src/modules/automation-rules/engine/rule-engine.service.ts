import { Injectable, Logger } from '@nestjs/common';
import { AutomationRuleRepository } from '../repositories/automation-rule.repository';
import { ExecutionLogService } from '../../automation-execution-log/execution-log.service';
import { NotificationsClientService } from '../clients/notifications-client.service';

/** Domain event consumed from the `audit.events` Kafka topic. */
export interface AutomationEvent {
  accountId?: number;
  action?: string; // create | update | delete | login | logout | approve | reject
  entityType?: string; // task | project | client | ...
  entityId?: number;
  userId?: number;
  description?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface RuleAction {
  type: 'notify' | 'webhook';
  // notify
  roleIds?: number[];
  userIds?: number[];
  excludeActor?: boolean;
  title?: string;
  message?: string;
  priority?: number;
  channels?: string[];
  actionUrl?: string;
  // webhook
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}

/**
 * The automation engine. For each incoming domain event it finds active rules in
 * the same account, matches them by trigger (`entityType.action`) + optional
 * conditions, runs their actions, and writes an execution log. Designed to never
 * throw out to the consumer — a failing rule is logged, others still run.
 */
@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    private readonly ruleRepo: AutomationRuleRepository,
    private readonly executionLog: ExecutionLogService,
    private readonly notifications: NotificationsClientService,
  ) {}

  async handleEvent(event: AutomationEvent): Promise<void> {
    if (!event.accountId) return;
    const rules = await this.ruleRepo.findActiveByAccount(event.accountId);
    if (!rules.length) return;

    for (const rule of rules) {
      if (!this.matchesTrigger(rule.triggerEvent, event)) continue;
      if (!this.matchesConditions(rule.triggerConditions, event)) continue;
      await this.runRule(rule, event);
    }
  }

  /** Trigger format: "<entityType>.<action>", with "*" wildcards (e.g. "task.*", "*"). */
  private matchesTrigger(triggerEvent: string | null, event: AutomationEvent): boolean {
    if (!triggerEvent) return false;
    const key = `${event.entityType ?? ''}.${event.action ?? ''}`;
    if (triggerEvent === '*' || triggerEvent === key) return true;
    const [tEntity, tAction] = triggerEvent.split('.');
    const entityOk = tEntity === '*' || tEntity === event.entityType;
    const actionOk = !tAction || tAction === '*' || tAction === event.action;
    return entityOk && actionOk;
  }

  /** Shallow equality of condition keys against the event (empty = always match). */
  private matchesConditions(conditions: any, event: AutomationEvent): boolean {
    if (!conditions || typeof conditions !== 'object') return true;
    const keys = Object.keys(conditions);
    if (keys.length === 0) return true;
    const flat: Record<string, unknown> = {
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      userId: event.userId,
    };
    return keys.every((k) => String(conditions[k]) === String(flat[k]));
  }

  private async runRule(rule: any, event: AutomationEvent): Promise<void> {
    const actions: RuleAction[] = Array.isArray(rule.actions) ? rule.actions : [];
    const results: Array<{ type: string; ok: boolean; error?: string }> = [];

    for (const action of actions) {
      try {
        await this.execute(action, event);
        results.push({ type: action.type, ok: true });
      } catch (err) {
        results.push({ type: action.type, ok: false, error: (err as Error).message });
      }
    }

    const success = results.every((r) => r.ok);
    try {
      await this.executionLog.create({
        automationRuleId: rule.id,
        triggerData: event as any,
        executionResult: { actions: results } as any,
        success,
        errorMessage: success
          ? undefined
          : results.filter((r) => !r.ok).map((r) => `${r.type}: ${r.error}`).join('; '),
      });
      await this.ruleRepo.recordExecution(rule.id);
    } catch (err) {
      this.logger.warn(`Failed to log execution for rule #${rule.id}: ${(err as Error).message}`);
    }

    this.logger.log(
      `Rule #${rule.id} "${rule.name}" fired on ${event.entityType}.${event.action} → ${success ? 'ok' : 'partial/fail'}`,
    );
  }

  private async execute(action: RuleAction, event: AutomationEvent): Promise<void> {
    switch (action.type) {
      case 'notify':
        await this.notifications.broadcast({
          accountId: event.accountId!,
          roleIds: action.roleIds,
          userIds: action.userIds,
          excludeUserId: action.excludeActor ? event.userId : undefined,
          title: this.render(action.title || 'Автоматизация', event),
          message: this.render(action.message || event.description || '', event),
          priority: action.priority,
          channels: action.channels,
          actionUrl: action.actionUrl,
          entityType: event.entityType,
          entityId: event.entityId,
        });
        return;
      case 'webhook': {
        if (!action.url) throw new Error('webhook action missing url');
        const res = await fetch(action.url, {
          method: action.method || 'POST',
          headers: { 'Content-Type': 'application/json', ...(action.headers || {}) },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`webhook responded ${res.status}`);
        return;
      }
      default:
        throw new Error(`unknown action type: ${(action as any).type}`);
    }
  }

  /** Minimal templating: replaces {{entityType}}, {{entityId}}, {{description}}, {{userId}}. */
  private render(tpl: string, event: AutomationEvent): string {
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      const v = (event as any)[k];
      return v === undefined || v === null ? '' : String(v);
    });
  }
}
