// src/audit/audit.controller.ts
import { Controller, ForbiddenException, Get, Query, Request as RequestDecorator, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthJwtGuard, AuthRequest } from '../common/guards/auth-jwt.guard';
import { AuditService } from './audit.service';

@Controller('admin/reporte')
@UseGuards(AuthJwtGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  private checkAdmin(req: AuthRequest): void {
    if (req.authUser.role !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden consultar auditoría');
    }
  }

  @Get('subscription/auditoria')
  getSubscriptionAudit(
    @RequestDecorator() req: AuthRequest,
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    this.checkAdmin(req);
    const qs = new URLSearchParams(query).toString();
    this.auditService.getSubscriptionAuditLogs(qs, res);
  }

  @Get('notification/auditoria')
  getNotificationAudit(
    @RequestDecorator() req: AuthRequest,
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    this.checkAdmin(req);
    const qs = new URLSearchParams(query).toString();
    this.auditService.getNotificationAuditLogs(qs, res);
  }

  @Get('fx/auditoria')
  getFxAudit(
    @RequestDecorator() req: AuthRequest,
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    this.checkAdmin(req);
    const qs = new URLSearchParams(query).toString();
    this.auditService.getFxAuditLogs(qs, res);
  }
}
