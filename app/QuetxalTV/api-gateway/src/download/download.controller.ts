import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DownloadService, PLAN } from './download.service';
import { AuthJwtGuard, AuthRequest } from '../common/guards/auth-jwt.guard';

@Controller('downloads')
@UseGuards(AuthJwtGuard)
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

@Post('initiate')
initiateDownload(
  @Body() body: { contentId: string; plan?: number; title?: string; thumbnail?: string },
  @Req() req: AuthRequest,
) {
  const token = this.extractToken(req)
  return this.downloadService.initiateDownload(
    req.authUser.userId,
    req.authUser.activeProfileId ?? '',
    body.contentId,
    body.plan ?? PLAN.PREMIUM,
    token,
    body.title ?? '',
    body.thumbnail ?? ''
  )
}
  @Get()
  listDownloads(
    @Req() req: AuthRequest,
    @Query('plan') planQuery?: string,
  ) {
    const token = this.extractToken(req)
    const plan = planQuery ? parseInt(planQuery) : PLAN.PREMIUM
    return this.downloadService.listDownloads(
      req.authUser.userId,
      req.authUser.activeProfileId ?? '',
      plan,
      token
    )
  }

  @Delete(':downloadId')
  deleteDownload(
    @Param('downloadId') downloadId: string,
    @Req() req: AuthRequest,
  ) {
    const token = this.extractToken(req)
    return this.downloadService.deleteDownload(
      req.authUser.userId,
      req.authUser.activeProfileId ?? '',
      downloadId,
      PLAN.PREMIUM,
      token
    )
  }

  private extractToken(req: AuthRequest): string {
    return (req.headers.authorization || '').replace('Bearer ', '').trim()
  }
}