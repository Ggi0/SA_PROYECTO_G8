import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Request as RequestDecorator, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CancelSubscriptionDto, SubscribeDto } from './dto/subscribe.dto';
import { AuditExportResult, SubscriptionService } from './subscription.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email?: string;
  };
};

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Get('plans/with-rates')
  @UseGuards(JwtGuard)
  getPlansWithRates(@Query('currency') currency: string | undefined, @RequestDecorator() req: AuthenticatedRequest) {
    return this.subscriptionService.getPlansWithRates(currency, req.user.id);
  }

  @Get('plans/:id')
  getPlanById(@Param('id') id: string) {
    return this.subscriptionService.getPlanById(id);
  }

  @Post('subscribe')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.CREATED)
  subscribe(@Body() dto: SubscribeDto, @RequestDecorator() req: AuthenticatedRequest) {
    return this.subscriptionService.subscribe(req.user.id, dto, req.user.email || '');
  }

  @Delete()
  @UseGuards(JwtGuard)
  cancelSubscription(@Body() dto: CancelSubscriptionDto, @RequestDecorator() req: AuthenticatedRequest) {
    return this.subscriptionService.cancelSubscription(req.user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  getMySubscription(@RequestDecorator() req: AuthenticatedRequest) {
    return this.subscriptionService.getUserSubscription(req.user.id);
  }

  @Get('payments')
  @UseGuards(JwtGuard)
  getPaymentHistory(@RequestDecorator() req: AuthenticatedRequest, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.subscriptionService.getPaymentHistory(req.user.id, Number(limit) || 10, Number(offset) || 0);
  }

  // ===== Admin — Auditoría transaccional (Fase 2) =====
  // Proxy gRPC → subscription-service. El frontend del panel de administración
  // consume estos endpoints para visualizar y descargar el log de auditoría.
  // NOTA: pendiente añadir verificación de rol de administrador (AdminGuard).

  // GET /subscriptions/admin/audit/logs?table=subscriptions&operation=UPDATE&from=&to=&page=1&page_size=20
  @Get('admin/audit/logs')
  @UseGuards(JwtGuard)
  getAuditLogs(
    @Query('table') table?: string,
    @Query('operation') operation?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.subscriptionService.getAuditLogs({
      tableName: table || '',
      operation: operation || '',
      from: from || '',
      to: to || '',
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  // GET /subscriptions/admin/audit/export?format=csv|pdf&table=&operation=&from=&to=
  @Get('admin/audit/export')
  @UseGuards(JwtGuard)
  async exportAuditLog(
    @Res() res: Response,
    @Query('format') format?: string,
    @Query('table') table?: string,
    @Query('operation') operation?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = (await firstValueFrom(
      this.subscriptionService.exportAuditLog({
        format: format || 'csv',
        tableName: table || '',
        operation: operation || '',
        from: from || '',
        to: to || '',
      }),
    )) as AuditExportResult;

    const content = Buffer.isBuffer(result.content) ? result.content : Buffer.from(result.content ?? '');
    res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename || 'audit_log'}"`);
    res.send(content);
  }
}
