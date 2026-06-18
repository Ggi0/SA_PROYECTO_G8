// src/historial/historial.controller.ts
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Request as RequestDecorator,
  UseGuards,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { AuthJwtGuard, AuthRequest } from '../common/guards/auth-jwt.guard';
import { HistorialService } from './historial.service';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

interface UpdateMovieProgressDto {
  profileId: string;
  contentId: string;
  minuteReached: number;
  totalDurationMin: number;
}

interface UpdateEpisodeProgressDto {
  profileId: string;
  contentId: string;
  seasonId: string;
  episodeId: string;
  seasonNum: number;
  episodeNum: number;
  minuteReached: number;
  totalDurationMin: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller()
export class HistorialController {
  constructor(private readonly historialService: HistorialService) {}

  // ── Auditoría (solo admin) ────────────────────────────────────────────────

  @Get('admin/reporte/historial/auditoria')
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

  @Get('admin/reporte/historial/contenido_nuevo')
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

  // ── Player (usuarios autenticados) ────────────────────────────────────────

  @Post('historial/movie-progress')
  @UseGuards(AuthJwtGuard)
  async updateMovieProgress(
    @Body() body: UpdateMovieProgressDto,
  ) {
    return lastValueFrom(
      this.historialService.updateMovieProgress(
        body.profileId,
        body.contentId,
        body.minuteReached,
        body.totalDurationMin,
      ),
    );
  }

  @Post('historial/episode-progress')
  @UseGuards(AuthJwtGuard)
  async updateEpisodeProgress(
    @Body() body: UpdateEpisodeProgressDto,
  ) {
    return lastValueFrom(
      this.historialService.updateEpisodeProgress(
        body.profileId,
        body.contentId,
        body.seasonId,
        body.episodeId,
        body.seasonNum,
        body.episodeNum,
        body.minuteReached,
        body.totalDurationMin,
      ),
    );
  }

  @Get('historial/continue-watching/:profileId')
  @UseGuards(AuthJwtGuard)
  async getContinueWatching(
    @Param('profileId') profileId: string,
    @Query('limit') limit?: string,
  ) {
    return lastValueFrom(
      this.historialService.getContinueWatching(
        profileId,
        limit ? Number(limit) : 10,
      ),
    );
  }

  @Get('historial/progress/:profileId/:contentId')
  @UseGuards(AuthJwtGuard)
  async getContentProgress(
    @Param('profileId') profileId: string,
    @Param('contentId') contentId: string,
  ) {
    return lastValueFrom(
      this.historialService.getContentProgress(profileId, contentId),
    );
  }
}
