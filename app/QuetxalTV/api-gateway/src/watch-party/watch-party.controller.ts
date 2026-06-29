import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { WatchPartyService } from './watch-party.service';
import { AuthJwtGuard, AuthRequest } from '../common/guards/auth-jwt.guard';
import { PremiumGuard } from './premium.guard';

@Controller('watch-party')
export class WatchPartyController {
  constructor(private readonly svc: WatchPartyService) {}

  // POST /watch-party  — el host crea una sala (solo Plan Premium)
  @Post()
  @UseGuards(AuthJwtGuard, PremiumGuard)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: AuthRequest,
    @Body() body: {
      contentId: string;
      contentTitle: string;
      posterUrl?: string;
      videoRef?: string;
      videoSource?: string;
      hostName?: string;
    },
  ) {
    const room = this.svc.create(
      req.authUser.activeProfileId ?? req.authUser.userId,
      body.hostName ?? req.authUser.email.split('@')[0],
      body.contentId,
      body.contentTitle,
      body.posterUrl ?? '',
      body.videoRef ?? '',
      body.videoSource ?? '',
    );
    return {
      partyId:       room.partyId,
      code:          room.code,
      contentId:     room.contentId,
      contentTitle:  room.contentTitle,
      posterUrl:     room.posterUrl,
      videoRef:      room.videoRef,
      videoSource:   room.videoSource,
      hostProfileId: room.hostProfileId,
      members:       room.members,
      state:         room.state,
      expiresAt:     room.expiresAt,
    };
  }

  // GET /watch-party/:code  — info de la sala (público para poder mostrar antes de join)
  @Get(':code')
  getRoom(@Param('code') code: string) {
    const room = this.svc.get(code);
    if (!room) throw new NotFoundException('Sala no encontrada o expirada');
    return {
      partyId:      room.partyId,
      code:         room.code,
      contentId:    room.contentId,
      contentTitle: room.contentTitle,
      posterUrl:    room.posterUrl,
      videoRef:     room.videoRef,
      videoSource:  room.videoSource,
      hostProfileId: room.hostProfileId,
      members:      room.members,
      state:        room.state,
      expiresAt:    room.expiresAt,
    };
  }

  // POST /watch-party/:code/join  — unirse a una sala
  @Post(':code/join')
  @UseGuards(AuthJwtGuard)
  @HttpCode(HttpStatus.OK)
  join(
    @Req() req: AuthRequest,
    @Param('code') code: string,
    @Body() body: { displayName?: string },
  ) {
    const profileId = req.authUser.activeProfileId ?? req.authUser.userId;
    const name = body.displayName ?? req.authUser.email.split('@')[0];
    const room = this.svc.join(code, profileId, name);
    if (!room) throw new NotFoundException('Sala no encontrada o expirada');
    return {
      code:         room.code,
      contentId:    room.contentId,
      contentTitle: room.contentTitle,
      posterUrl:    room.posterUrl,
      videoRef:     room.videoRef,
      videoSource:  room.videoSource,
      hostProfileId: room.hostProfileId,
      members:      room.members,
      state:        room.state,
    };
  }

  // POST /watch-party/:code/state  — el host actualiza posición/play/pause
  @Post(':code/state')
  @UseGuards(AuthJwtGuard)
  @HttpCode(HttpStatus.OK)
  updateState(
    @Req() req: AuthRequest,
    @Param('code') code: string,
    @Body() body: { isPlaying: boolean; positionSeconds: number },
  ) {
    const profileId = req.authUser.activeProfileId ?? req.authUser.userId;
    const state = this.svc.updateState(code, profileId, body.isPlaying, body.positionSeconds);
    if (!state) throw new ForbiddenException('Solo el host puede actualizar el estado');
    return state;
  }

  // GET /watch-party/:code/state  — los guests hacen polling de este endpoint
  @Get(':code/state')
  @UseGuards(AuthJwtGuard)
  getState(@Param('code') code: string) {
    const room = this.svc.get(code);
    if (!room) throw new NotFoundException('Sala no encontrada o expirada');
    return { ...room.state, members: room.members };
  }

  // DELETE /watch-party/:code  — salir o cerrar sala
  @Delete(':code')
  @UseGuards(AuthJwtGuard)
  @HttpCode(HttpStatus.OK)
  leave(@Req() req: AuthRequest, @Param('code') code: string) {
    const profileId = req.authUser.activeProfileId ?? req.authUser.userId;
    this.svc.leave(code, profileId);
    return { success: true };
  }
}
