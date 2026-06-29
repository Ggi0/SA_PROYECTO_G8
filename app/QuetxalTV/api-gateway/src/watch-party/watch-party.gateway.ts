import * as jwt from 'jsonwebtoken';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WatchPartyService } from './watch-party.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class WatchPartyGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Mantiene relación socketId → { code, profileId } para cleanup en disconnect
  private readonly socketMap = new Map<string, { code: string; profileId: string }>();

  constructor(private readonly svc: WatchPartyService) {}

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      (client.handshake.headers.authorization as string | undefined)?.replace('Bearer ', '');

    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const secret = process.env.JWT_ACCESS_SECRET || 'super_access_secret_local';
      jwt.verify(token, secret);
    } catch {
      client.disconnect();
    }
  }

  // Cliente se une a una sala específica
  @SubscribeMessage('room:join')
  handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { code: string; profileId: string; displayName: string },
  ) {
    const room = this.svc.get(payload.code);
    if (!room) {
      client.emit('error', 'Sala no encontrada o expirada');
      return;
    }
    client.join(payload.code);
    this.socketMap.set(client.id, { code: payload.code, profileId: payload.profileId });

    // Registrar miembro (o actualizar si ya existe vía HTTP join)
    const updated = this.svc.join(payload.code, payload.profileId, payload.displayName);
    if (updated) {
      this.server.to(payload.code).emit('members:update', updated.members);
    }
    // Enviar estado actual al cliente que se une
    client.emit('state:sync', room.state);
  }

  // Host actualiza posición / play / pause → broadcast a toda la sala
  @SubscribeMessage('state:update')
  handleStateUpdate(
    @ConnectedSocket() _client: Socket,
    @MessageBody() payload: {
      code: string;
      profileId: string;
      isPlaying: boolean;
      positionSeconds: number;
    },
  ) {
    const state = this.svc.updateState(
      payload.code,
      payload.profileId,
      payload.isPlaying,
      payload.positionSeconds,
    );
    if (!state) return;
    this.server.to(payload.code).emit('state:sync', state);
  }

  // Cliente sale explícitamente de la sala
  @SubscribeMessage('room:leave')
  handleRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { code: string; profileId: string },
  ) {
    const room = this.svc.get(payload.code);
    const isHost = room?.hostProfileId === payload.profileId;
    this.svc.leave(payload.code, payload.profileId);
    client.leave(payload.code);
    this.socketMap.delete(client.id);
    if (isHost) {
      // Host salió a propósito: destruir sala y notificar a todos
      this.server.to(payload.code).emit('room:closed', 'El host cerró la sala');
      this.svc.destroy(payload.code);
    } else {
      const updated = this.svc.get(payload.code);
      if (updated) this.server.to(payload.code).emit('members:update', updated.members);
    }
  }

  // Desconexión inesperada (cerrar tab, caída de red, etc.) — NO destruye la sala
  handleDisconnect(client: Socket) {
    const entry = this.socketMap.get(client.id);
    if (!entry) return;
    this.svc.leave(entry.code, entry.profileId);
    client.leave(entry.code);
    this.socketMap.delete(client.id);
    const room = this.svc.get(entry.code);
    if (room) this.server.to(entry.code).emit('members:update', room.members);
  }
}
