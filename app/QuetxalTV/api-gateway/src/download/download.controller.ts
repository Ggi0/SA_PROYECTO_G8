import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { DownloadService, PLAN } from './download.service';

@Controller('downloads')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  // ── Iniciar descarga ────────────────────────────────────
  // POST /downloads/initiate
  @Post('initiate')
  initiateDownload(
    @Body() body: { contentId: string },
    @Req() req: Request,
  ) {
    const { userId, profileId, plan } = this.extractUserClaims(req);
    return this.downloadService.initiateDownload(
      userId,
      profileId,
      body.contentId,
      plan,
    );
  }

  // ── Listar descargas del perfil ─────────────────────────
  // GET /downloads
  @Get()
  listDownloads(@Req() req: Request) {
    const { userId, profileId, plan } = this.extractUserClaims(req);
    return this.downloadService.listDownloads(userId, profileId, plan);
  }

  // ── Eliminar una descarga ───────────────────────────────
  // DELETE /downloads/:downloadId
  @Delete(':downloadId')
  deleteDownload(
    @Param('downloadId') downloadId: string,
    @Req() req: Request,
  ) {
    const { userId, profileId, plan } = this.extractUserClaims(req);
    return this.downloadService.deleteDownload(
      userId,
      profileId,
      downloadId,
      plan,
    );
  }

  // ── Extrae claims del JWT ya validado por el guard ──────
  private extractUserClaims(req: Request): {
    userId: string;
    profileId: string;
    plan: number;
  } {
    // El JWT guard ya validó el token y adjuntó los claims en req.user
    const user = (req as any).user || {};

    const planStr: string = (user.plan || '').toUpperCase();
    const planMap: Record<string, number> = {
      BASIC:    PLAN.BASIC,
      STANDARD: PLAN.STANDARD,
      PREMIUM:  PLAN.PREMIUM,
    };

    return {
      userId:    user.userId    || user.user_id    || '',
      profileId: user.profileId || user.profile_id || '',
      plan:      planMap[planStr] ?? PLAN.UNKNOWN,
    };
  }
}