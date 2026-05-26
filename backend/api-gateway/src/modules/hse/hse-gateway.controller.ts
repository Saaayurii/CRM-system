import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

function authHeaders(req: Request) {
  return { authorization: req.headers.authorization || '' };
}

function jsonHeaders(req: Request) {
  return {
    authorization: req.headers.authorization || '',
    'content-type': 'application/json',
  };
}

@ApiTags('HSE')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class HseGatewayController {
  constructor(private readonly proxy: ProxyService) {}

  @Get('hse/summary')
  @ApiOperation({ summary: 'HSE dashboard summary' })
  summary(@Req() req: Request) {
    return this.proxy.forward('inspections', {
      method: 'GET',
      path: '/hse/summary',
      headers: authHeaders(req),
    });
  }

  // ── Generic CRUD helper for every HSE entity ────────────────
  private list(req: Request, segment: string, query: any) {
    return this.proxy.forward('inspections', {
      method: 'GET',
      path: `/${segment}`,
      headers: authHeaders(req),
      params: query,
    });
  }
  private getOne(req: Request, segment: string, id: string) {
    return this.proxy.forward('inspections', {
      method: 'GET',
      path: `/${segment}/${id}`,
      headers: authHeaders(req),
    });
  }
  private createOne(req: Request, segment: string, body: any) {
    return this.proxy.forward('inspections', {
      method: 'POST',
      path: `/${segment}`,
      headers: jsonHeaders(req),
      data: body,
    });
  }
  private updateOne(req: Request, segment: string, id: string, body: any) {
    return this.proxy.forward('inspections', {
      method: 'PUT',
      path: `/${segment}/${id}`,
      headers: jsonHeaders(req),
      data: body,
    });
  }
  private deleteOne(req: Request, segment: string, id: string) {
    return this.proxy.forward('inspections', {
      method: 'DELETE',
      path: `/${segment}/${id}`,
      headers: authHeaders(req),
    });
  }
  private action(req: Request, segment: string, id: string, action: string, body: any = {}) {
    return this.proxy.forward('inspections', {
      method: 'POST',
      path: `/${segment}/${id}/${action}`,
      headers: jsonHeaders(req),
      data: body,
    });
  }

  // ── Risks ──────────────────────────────────────────────────
  @Get('hse-risks') risksList(@Req() req: Request, @Query() q: any) { return this.list(req, 'hse-risks', q); }
  @Get('hse-risks/:id') risksGet(@Req() req: Request, @Param('id') id: string) { return this.getOne(req, 'hse-risks', id); }
  @Post('hse-risks') risksCreate(@Req() req: Request, @Body() b: any) { return this.createOne(req, 'hse-risks', b); }
  @Put('hse-risks/:id') risksUpdate(@Req() req: Request, @Param('id') id: string, @Body() b: any) { return this.updateOne(req, 'hse-risks', id, b); }
  @Delete('hse-risks/:id') risksDelete(@Req() req: Request, @Param('id') id: string) { return this.deleteOne(req, 'hse-risks', id); }

  // ── Incidents ──────────────────────────────────────────────
  @Get('hse-incidents') incList(@Req() req: Request, @Query() q: any) { return this.list(req, 'hse-incidents', q); }
  @Get('hse-incidents/:id') incGet(@Req() req: Request, @Param('id') id: string) { return this.getOne(req, 'hse-incidents', id); }
  @Post('hse-incidents') incCreate(@Req() req: Request, @Body() b: any) { return this.createOne(req, 'hse-incidents', b); }
  @Put('hse-incidents/:id') incUpdate(@Req() req: Request, @Param('id') id: string, @Body() b: any) { return this.updateOne(req, 'hse-incidents', id, b); }
  @Delete('hse-incidents/:id') incDelete(@Req() req: Request, @Param('id') id: string) { return this.deleteOne(req, 'hse-incidents', id); }

  // ── Permits ────────────────────────────────────────────────
  @Get('hse-permits') prmList(@Req() req: Request, @Query() q: any) { return this.list(req, 'hse-permits', q); }
  @Get('hse-permits/:id') prmGet(@Req() req: Request, @Param('id') id: string) { return this.getOne(req, 'hse-permits', id); }
  @Post('hse-permits') prmCreate(@Req() req: Request, @Body() b: any) { return this.createOne(req, 'hse-permits', b); }
  @Put('hse-permits/:id') prmUpdate(@Req() req: Request, @Param('id') id: string, @Body() b: any) { return this.updateOne(req, 'hse-permits', id, b); }
  @Post('hse-permits/:id/approve') prmApprove(@Req() req: Request, @Param('id') id: string, @Body() b: any) { return this.action(req, 'hse-permits', id, 'approve', b); }
  @Post('hse-permits/:id/close') prmClose(@Req() req: Request, @Param('id') id: string, @Body() b: any) { return this.action(req, 'hse-permits', id, 'close', b); }
  @Delete('hse-permits/:id') prmDelete(@Req() req: Request, @Param('id') id: string) { return this.deleteOne(req, 'hse-permits', id); }

  // ── Violations ─────────────────────────────────────────────
  @Get('hse-violations') vioList(@Req() req: Request, @Query() q: any) { return this.list(req, 'hse-violations', q); }
  @Get('hse-violations/:id') vioGet(@Req() req: Request, @Param('id') id: string) { return this.getOne(req, 'hse-violations', id); }
  @Post('hse-violations') vioCreate(@Req() req: Request, @Body() b: any) { return this.createOne(req, 'hse-violations', b); }
  @Put('hse-violations/:id') vioUpdate(@Req() req: Request, @Param('id') id: string, @Body() b: any) { return this.updateOne(req, 'hse-violations', id, b); }
  @Post('hse-violations/:id/resolve') vioResolve(@Req() req: Request, @Param('id') id: string, @Body() b: any) { return this.action(req, 'hse-violations', id, 'resolve', b); }
  @Delete('hse-violations/:id') vioDelete(@Req() req: Request, @Param('id') id: string) { return this.deleteOne(req, 'hse-violations', id); }

  // ── Corrective Actions ─────────────────────────────────────
  @Get('hse-corrective-actions') actList(@Req() req: Request, @Query() q: any) { return this.list(req, 'hse-corrective-actions', q); }
  @Get('hse-corrective-actions/:id') actGet(@Req() req: Request, @Param('id') id: string) { return this.getOne(req, 'hse-corrective-actions', id); }
  @Post('hse-corrective-actions') actCreate(@Req() req: Request, @Body() b: any) { return this.createOne(req, 'hse-corrective-actions', b); }
  @Put('hse-corrective-actions/:id') actUpdate(@Req() req: Request, @Param('id') id: string, @Body() b: any) { return this.updateOne(req, 'hse-corrective-actions', id, b); }
  @Post('hse-corrective-actions/:id/complete') actComplete(@Req() req: Request, @Param('id') id: string, @Body() b: any) { return this.action(req, 'hse-corrective-actions', id, 'complete', b); }
  @Delete('hse-corrective-actions/:id') actDelete(@Req() req: Request, @Param('id') id: string) { return this.deleteOne(req, 'hse-corrective-actions', id); }

  // ── Monitoring ─────────────────────────────────────────────
  @Get('hse-monitoring') monList(@Req() req: Request, @Query() q: any) { return this.list(req, 'hse-monitoring', q); }
  @Get('hse-monitoring/:id') monGet(@Req() req: Request, @Param('id') id: string) { return this.getOne(req, 'hse-monitoring', id); }
  @Post('hse-monitoring') monCreate(@Req() req: Request, @Body() b: any) { return this.createOne(req, 'hse-monitoring', b); }
  @Put('hse-monitoring/:id') monUpdate(@Req() req: Request, @Param('id') id: string, @Body() b: any) { return this.updateOne(req, 'hse-monitoring', id, b); }
  @Delete('hse-monitoring/:id') monDelete(@Req() req: Request, @Param('id') id: string) { return this.deleteOne(req, 'hse-monitoring', id); }
}
