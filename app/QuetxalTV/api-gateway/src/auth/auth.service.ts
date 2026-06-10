// src/auth/auth.service.ts  (API Gateway)
//
// Este servicio es un proxy gRPC liviano.
// No contiene lógica de negocio — solo traduce llamadas HTTP → gRPC.
// Toda la lógica vive en el Auth Microservice.

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
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
  Register(data: unknown):       Observable<unknown>;
  Login(data: unknown):          Observable<unknown>;
  RefreshToken(data: unknown):   Observable<unknown>;
  Logout(data: unknown):         Observable<unknown>;
  LogoutAll(data: unknown):      Observable<unknown>;
  // Cuenta
  GetMe(data: unknown):          Observable<unknown>;
  ChangePassword(data: unknown): Observable<unknown>;
  ForgotPassword(data: unknown): Observable<unknown>;
  ResetPassword(data: unknown):  Observable<unknown>;
  // Perfiles
  ListProfiles(data: unknown):   Observable<unknown>;
  CreateProfile(data: unknown):  Observable<unknown>;
  UpdateProfile(data: unknown):  Observable<unknown>;
  DeleteProfile(data: unknown):  Observable<unknown>;
  SelectProfile(data: unknown):  Observable<unknown>;
}

@Injectable()
export class AuthGatewayService implements OnModuleInit {
  private authSvc!: AuthGrpcService;

  constructor(
    @Inject(AUTH_SERVICE_GRPC)
    private readonly client: any,
  ) {}
  

  onModuleInit() {
    // 'AuthService' debe coincidir exactamente con el nombre en auth.proto
    this.authSvc = this.client.getService('AuthService');  }
  

  // ─────────────────────────────────────────────
  //  Helper — convierte Observable a Promise
  // ─────────────────────────────────────────────
  private call<T>(obs: Observable<T>): Promise<T> {
    return firstValueFrom(obs);
  }

  // ─────────────────────────────────────────────
  //  AUTENTICACIÓN
  // ─────────────────────────────────────────────

register(data: { email: string; password: string; display_name: string }) {
  const payload = {
    email:        data.email,
    password:     data.password,
    display_name: data.display_name,  // ← snake_case, igual que el proto
  };
  
  console.log('GRPC PAYLOAD=', payload);
  return this.call(this.authSvc.Register(payload));
}

  login(data: {
    email:       string;
    password:    string;
    deviceInfo?: string;
    ipAddress?:  string;
  }) {
    return this.call(this.authSvc.Login({
      email:       data.email,
      password:    data.password,
      device_info: data.deviceInfo ?? '',
      ip_address:  data.ipAddress  ?? '',
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
      user_id:           userId,
      active_profile_id: activeProfileId ?? '',
    }));
  }

  changePassword(data: {
    userId:          string;
    currentPassword: string;
    newPassword:     string;
  }) {
    return this.call(this.authSvc.ChangePassword({
      user_id:          data.userId,
      current_password: data.currentPassword,
      new_password:     data.newPassword,
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
    return this.call(this.authSvc.ListProfiles({ user_id: userId }));
  }

  createProfile(data: {
    userId:      string;
    displayName: string;
    isKidsMode?: boolean;
    avatarUrl?:  string;
  }) {
    return this.call(this.authSvc.CreateProfile({
      user_id:      data.userId,
      displayName: data.displayName,
      is_kids_mode: data.isKidsMode ?? false,
      avatar_url:   data.avatarUrl  ?? '',
    }));
  }

  updateProfile(data: {
    userId:       string;
    profileId:    string;
    displayName?: string;
    avatarUrl?:   string;
    isKidsMode?:  boolean;
  }) {
    return this.call(this.authSvc.UpdateProfile({
      user_id:      data.userId,
      profile_id:   data.profileId,
      displayName: data.displayName ?? '',
      avatar_url:   data.avatarUrl   ?? '',
      is_kids_mode: data.isKidsMode  ?? false,
    }));
  }

  deleteProfile(userId: string, profileId: string) {
    return this.call(this.authSvc.DeleteProfile({
      user_id:    userId,
      profile_id: profileId,
    }));
  }

  selectProfile(userId: string, profileId: string) {
    return this.call(this.authSvc.SelectProfile({
      user_id:    userId,
      profile_id: profileId,
    }));
  }
}