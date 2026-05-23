import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompanyBankAccountsService } from './company-bank-accounts.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateCompanyBankAccountDto,
  UpdateCompanyBankAccountDto,
} from './dto/upsert-company-bank-account.dto';

@ApiTags('Company Bank Accounts')
@ApiBearerAuth()
@Controller('company-bank-accounts')
export class CompanyBankAccountsController {
  constructor(private readonly svc: CompanyBankAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List company bank accounts' })
  list(@CurrentUser('accountId') accountId: number) {
    return this.svc.list(accountId);
  }

  @Post()
  @ApiOperation({ summary: 'Create company bank account' })
  create(
    @CurrentUser('accountId') accountId: number,
    @Body() dto: CreateCompanyBankAccountDto,
  ) {
    return this.svc.create(accountId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update company bank account' })
  update(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyBankAccountDto,
  ) {
    return this.svc.update(accountId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete company bank account' })
  remove(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.remove(accountId, id);
  }
}
