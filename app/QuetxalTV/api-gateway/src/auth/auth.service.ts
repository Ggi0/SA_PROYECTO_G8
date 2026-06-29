// src/auth/auth.service.ts  (API Gateway)
//
// Este servicio es un proxy gRPC liviano.
// No contiene lógica de negocio — solo traduce llamadas HTTP → gRPC.
// Toda la lógica vive en el Auth Microservice.

import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';
import { AUTH_SERVICE_GRPC } from './auth.constants';

console.log('TOKEN=', AUTH_SERVICE_GRPC);

// ─────────────────────────────────────────────
//  Interfaz del stub gRPC generado desde auth.proto
//  Refleja exactamente los RPCs definidos en service AuthService {}
// ─────────────────────────────────────────────

interface AuthGrpcService {
  // Autenticación
  Register(data: unknown): Observable<unknown>;
  Login(data: unknown): Observable<unknown>;
  RefreshToken(data: unknown): Observable<unknown>;
  Logout(data: unknown): Observable<unknown>;
  LogoutAll(data: unknown): Observable<unknown>;
  // Cuenta
  GetMe(data: unknown): Observable<unknown>;
  ChangePassword(data: unknown): Observable<unknown>;
  ForgotPassword(data: unknown): Observable<unknown>;
  ResetPassword(data: unknown): Observable<unknown>;
  // Perfiles
  ListProfiles(data: unknown): Observable<unknown>;
  CreateProfile(data: unknown): Observable<unknown>;
  UpdateProfile(data: unknown): Observable<unknown>;
  DeleteProfile(data: unknown): Observable<unknown>;
  SelectProfile(data: unknown): Observable<unknown>;

  // ── Auditoría ─────────────────────────
  GetAuditLogs(data: unknown): Observable<unknown>;
  ExportAuditLogs(data: unknown): Observable<unknown>;

  // ── Health ─────────────────────────
  HealthLive(data: unknown): Observable<unknown>;
  HealthReady(data: unknown): Observable<unknown>;

  // admin
  GetAllUsersWithProfiles(data: unknown): Observable<unknown>;
GetAuditEventLogs(data: unknown): Observable<unknown>;
}

@Injectable()
export class AuthGatewayService implements OnModuleInit {
  private authSvc!: AuthGrpcService;

  constructor(
    @Inject(AUTH_SERVICE_GRPC)
    private readonly client: any,
  ) { }


  onModuleInit() {
    // 'AuthService' debe coincidir exactamente con el nombre en auth.proto
    this.authSvc = this.client.getService('AuthService');
  }


  // ─────────────────────────────────────────────
  //  Helper — convierte Observable a Promise
  // ─────────────────────────────────────────────
  private async call<T>(obs: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(obs);
    } catch (err: any) {
      const message = err?.details || err?.message || 'Error en auth-service';
      const status = this.authMessageToHttpStatus(message) ?? this.grpcCodeToHttpStatus(err?.code);
      throw new HttpException(message, status);
    }
  }

  private grpcCodeToHttpStatus(code?: number): HttpStatus {
    switch (code) {
      case 3:
        return HttpStatus.BAD_REQUEST;
      case 5:
        return HttpStatus.NOT_FOUND;
      case 6:
        return HttpStatus.CONFLICT;
      case 7:
      case 16:
        return HttpStatus.UNAUTHORIZED;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private authMessageToHttpStatus(message: string): HttpStatus | null {
    const lower = message.toLowerCase();
    if (
      lower.includes('credenciales') ||
      lower.includes('no activada') ||
      lower.includes('unauthorized')
    ) {
      return HttpStatus.UNAUTHORIZED;
    }
    if (lower.includes('registrado') || lower.includes('conflict')) {
      return HttpStatus.CONFLICT;
    }
    if (lower.includes('not found') || lower.includes('no encontrado')) {
      return HttpStatus.NOT_FOUND;
    }
    if (lower.includes('bad request') || lower.includes('inválido') || lower.includes('invalido')) {
      return HttpStatus.BAD_REQUEST;
    }
    return null;
  }

  // ─────────────────────────────────────────────
  //  AUTENTICACIÓN
  // ─────────────────────────────────────────────

  register(data: { email: string; password: string; displayName: string }) {
    const payload = {
      email: data.email,
      password: data.password,
      displayName: data.displayName,  // ← snake_case, igual que el proto TODO:
    };

    console.log('GRPC PAYLOAD=', payload);
    return this.call(this.authSvc.Register(payload));
  }

  login(data: {
    email: string;
    password: string;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    return this.call(this.authSvc.Login({
      email: data.email,
      password: data.password,
      device_info: data.deviceInfo ?? '',
      ip_address: data.ipAddress ?? '',
    }));
  }

  refreshToken(rawToken: string) {
    return this.call(this.authSvc.RefreshToken({ refresh_token: rawToken }));
  }

  logout(rawToken: string) {
    return this.call(this.authSvc.Logout({ refresh_token: rawToken }));
  }

  logoutAll(userId: string) {
    return this.call(this.authSvc.LogoutAll({ user_id: userId }));
  }

  // ─────────────────────────────────────────────
  //  CUENTA
  // ─────────────────────────────────────────────

  getMe(userId: string, activeProfileId: string | null) {
    return this.call(this.authSvc.GetMe({
      userId: userId,
      activeProfileId: activeProfileId ?? '',
    }));
  }

  changePassword(data: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    return this.call(this.authSvc.ChangePassword({
      userId: data.userId,
      current_password: data.currentPassword,
      new_password: data.newPassword,
    }));
  }

  forgotPassword(email: string) {
    return this.call(this.authSvc.ForgotPassword({ email }));
  }

  resetPassword(token: string, newPassword: string) {
    return this.call(this.authSvc.ResetPassword({
      token,
      new_password: newPassword,
    }));
  }

  // ─────────────────────────────────────────────
  //  PERFILES
  // ─────────────────────────────────────────────

  listProfiles(userId: string) {
    return this.call(this.authSvc.ListProfiles({ userId: userId }));
  }

  createProfile(data: {
    userId: string;
    displayName: string;
    isKidsMode?: boolean;
    avatarUrl?: string;
  }) {
    return this.call(this.authSvc.CreateProfile({
      userId: data.userId,
      displayName: data.displayName,
      isKidsMode: data.isKidsMode ?? false,
      avatarUrl: data.avatarUrl ?? '',
    }));
  }

  updateProfile(data: {
    userId: string;
    profileId: string;
    displayName?: string;
    avatarUrl?: string;
    isKidsMode?: boolean;
  }) {
    return this.call(this.authSvc.UpdateProfile({
      userId: data.userId,
      profileId: data.profileId,
      displayName: data.displayName ?? '',
      avatarUrl: data.avatarUrl ?? '',
      isKidsMode: data.isKidsMode ?? false,
    }));
  }

  deleteProfile(userId: string, profileId: string) {
    return this.call(this.authSvc.DeleteProfile({
      userId: userId,
      profileId: profileId,
    }));
  }

  selectProfile(userId: string, profileId: string) {
    return this.call(this.authSvc.SelectProfile({
      userId: userId,
      profileId: profileId,
    }));
  }



  // ─────────────────────────────────────────────
//  AUDITORÍA
// ─────────────────────────────────────────────

getAuditLogs(data: {
  adminUserId: string;
  userId?: string;
  tableName?: string;
  operation?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) {
  return this.call(this.authSvc.GetAuditLogs({
    adminUserId: data.adminUserId, // ✅ snake_case aquí
    userId: data.userId,
    tableName: data.tableName,
    operation: data.operation,
    fromDate: data.fromDate,
    toDate: data.toDate,
    page: data.page ?? 1,
    pageSize: data.pageSize ?? 10,
  }));
}

exportAuditLogs(data: {
  adminUserId: string;
  format?: string;
}) {
  return this.call(this.authSvc.ExportAuditLogs({
    adminUserId: data.adminUserId, // ✅ snake_case
    format: data.format ?? 'csv',
  }));
}


// ─────────────────────────────────────────────
//  HEALTH
// ─────────────────────────────────────────────

healthLive() {
  return this.call(this.authSvc.HealthLive({}));
}

healthReady() {
  return this.call(this.authSvc.HealthReady({}));
}


// ─────────────────────────────────────────────
//  ADMIN — CRON MONITORING
// ─────────────────────────────────────────────

getAllUsersWithProfiles(adminUserId: string) {
  return this.call(this.authSvc.GetAllUsersWithProfiles({
    adminUserId: adminUserId,
  }));
}

getAuditEventLogs(data: {
  adminUserId: string;
  eventType?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) {
  return this.call(this.authSvc.GetAuditEventLogs({
    adminUserId: data.adminUserId,
    eventType:   data.eventType   ?? '',
    userId:      data.userId      ?? '',
    fromDate:    data.fromDate    ?? '',
    toDate:      data.toDate      ?? '',
    page:        data.page        ?? 1,
    pageSize:    data.pageSize    ?? 20,
  }));
}


}
