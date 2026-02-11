import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AutomationRulesService } from './automation-rules.service';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Automation Rules')
@ApiBearerAuth()
@Controller('automation-rules')
export class AutomationRulesController {
  constructor(private readonly svc: AutomationRulesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all automation rules' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.svc.findAll(accountId, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get automation rule by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.findById(id, accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create automation rule' })
  create(
    @Body() dto: CreateAutomationRuleDto,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.create(accountId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update automation rule' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAutomationRuleDto,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.update(id, accountId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete automation rule' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.svc.delete(id, accountId);
  }
}
