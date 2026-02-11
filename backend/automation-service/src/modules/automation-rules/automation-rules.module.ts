import { Module } from '@nestjs/common';
import { AutomationRulesController } from './automation-rules.controller';
import { AutomationRulesService } from './automation-rules.service';
import { AutomationRuleRepository } from './repositories/automation-rule.repository';
@Module({
  controllers: [AutomationRulesController],
  providers: [AutomationRulesService, AutomationRuleRepository],
  exports: [AutomationRulesService],
})
export class AutomationRulesModule {}
