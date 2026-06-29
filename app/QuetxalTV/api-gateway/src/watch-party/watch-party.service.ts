import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface PartyMember {
  profileId: string;
  name: string;
  joinedAt: string;
}

export interface PartyState {
  isPlaying: boolean;
  positionSeconds: number;
  updatedAt: string;
  updatedBy: string;
}

export interface WatchPartyRoom {
  partyId: string;
  code: string;
  contentId: string;
  contentTitle: string;
  posterUrl: string;
  videoRef: string;
  videoSource: string;
  hostProfileId: string;
  members: PartyMember[];
  state: PartyState;
  createdAt: string;
  expiresAt: string;
}

@Injectable()
export class WatchPartyService {
  private readonly rooms = new Map<string, WatchPartyRoom>();

  // Genera código de 6 caracteres alfanumérico en mayúsculas
  private generateCode(): string {
    let code: string;
    do {
      code = randomBytes(3).toString('hex').toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  create(
    hostProfileId: string,
    hostName: string,
    contentId: string,
    contentTitle: string,
    posterUrl = '',
    videoRef = '',
    videoSource = '',
  ): WatchPartyRoom {
    this.cleanExpired();
    const code = this.generateCode();
    const now = new Date();
    const room: WatchPartyRoom = {
      partyId:       randomBytes(8).toString('hex'),
      code,
      contentId,
      contentTitle,
      posterUrl,
      videoRef,
      videoSource,
      hostProfileId,
      members: [{ profileId: hostProfileId, name: hostName, joinedAt: now.toISOString() }],
      state: { isPlaying: false, positionSeconds: 0, updatedAt: now.toISOString(), updatedBy: hostProfileId },
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4 horas
    };
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): WatchPartyRoom | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return null;
    if (new Date(room.expiresAt) < new Date()) {
      this.rooms.delete(code.toUpperCase());
      return null;
    }
    return room;
  }

  join(code: string, profileId: string, name: string): WatchPartyRoom | null {
    const room = this.get(code);
    if (!room) return null;
    const already = room.members.find((m) => m.profileId === profileId);
    if (!already) {
      room.members.push({ profileId, name, joinedAt: new Date().toISOString() });
    }
    return room;
  }

  updateState(
    code: string,
    profileId: string,
    isPlaying: boolean,
    positionSeconds: number,
  ): PartyState | null {
    const room = this.get(code);
    if (!room) return null;
    // Solo el host puede actualizar el estado
    if (room.hostProfileId !== profileId) return null;
    room.state = {
      isPlaying,
      positionSeconds,
      updatedAt: new Date().toISOString(),
      updatedBy: profileId,
    };
    return room.state;
  }

  leave(code: string, profileId: string): void {
    const room = this.get(code);
    if (!room) return;
    room.members = room.members.filter((m) => m.profileId !== profileId);
    if (room.members.length === 0 || room.hostProfileId === profileId) {
      this.rooms.delete(code.toUpperCase());
    }
  }

  private cleanExpired(): void {
    const now = new Date();
    for (const [code, room] of this.rooms) {
      if (new Date(room.expiresAt) < now) this.rooms.delete(code);
    }
  }
}
