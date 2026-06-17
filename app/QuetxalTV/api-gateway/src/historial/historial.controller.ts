import {Controller,ForbiddenException,Get,Query,Request as RequestDecorator,UseGuards,} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { AuthJwtGuard, AuthRequest } from '../common/guards/auth-jwt.guard';
import { HistorialService } from './historial.service';

@Controller('api/admin/reporte/historial')
export class HistorialController {
  constructor(private readonly historialService: HistorialService) {}

  @Get('auditoria')
  @UseGuards(AuthJwtGuard)
  async getAuditLogs(
    @RequestDecorator() req: AuthRequest,
    @Query('table') tableName?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (req.authUser.role !== 'admin') {
      throw new ForbiddenException(
        'Solo usuarios administradores pueden consultar reportes de auditoría',
      );
    }

    const response = await lastValueFrom(
      this.historialService.getHistoryAuditLogs(
        tableName || '',
        action || '',
        Number(limit) || 100,
        Number(offset) || 0,
      ),
    );

    return {
      success: true,
      service: 'historial',
      report: 'auditoria',
      data: response.items,
    };
  }

  @Get('contenido_nuevo')
  @UseGuards(AuthJwtGuard)
  async getAuditLogsAlias(
    @RequestDecorator() req: AuthRequest,
    @Query('table') tableName?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (req.authUser.role !== 'admin') {
      throw new ForbiddenException(
        'Solo usuarios administradores pueden consultar reportes de auditoría',
      );
    }

    const response = await lastValueFrom(
      this.historialService.getHistoryAuditLogs(
        tableName || '',
        action || '',
        Number(limit) || 100,
        Number(offset) || 0,
      ),
    );

    return {
      success: true,
      service: 'historial',
      report: 'contenido_nuevo',
      data: response.items,
    };
  }
}