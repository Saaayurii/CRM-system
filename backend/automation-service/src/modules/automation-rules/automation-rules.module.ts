import { Module } from '@nestjs/common';
import { AutomationRulesController } from './automation-rules.controller';
import { AutomationRulesService } from './automation-rules.service';
import { AutomationRuleRepository } from './repositories/automation-rule.repository';
import { ExecutionLogModule } from '../automation-execution-log/execution-log.module';
import { NotificationsClientService } from './clients/notifications-client.service';
import { RuleEngineService } from './engine/rule-engine.service';
import { AutomationConsumerService } from './kafka/automation-consumer.service';

@Module({
  imports: [ExecutionLogModule],
  controllers: [AutomationRulesController],
  providers: [
    AutomationRulesService,
    AutomationRuleRepository,
    NotificationsClientService,
    RuleEngineService,
    AutomationConsumerService,
  ],
  exports: [AutomationRulesService],
})
export class AutomationRulesModule {}
