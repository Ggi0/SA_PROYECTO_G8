// src/auth/auth.controller.ts

import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import type {
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ValidateTokenRequest,
} from './auth.contract';

// El nombre del servicio debe coincidir exactamente con auth.proto → service AuthService
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─────────────────────────────────────────────
  //  Mapeado al proto: AuthService.ValidateToken
  //  Usado por API Gateway y otros microservicios
  // ─────────────────────────────────────────────
  @GrpcMethod('AuthService', 'ValidateToken')
  validateToken(data: ValidateTokenRequest) {
    return this.authService.validateToken(data);
  }

  // ─────────────────────────────────────────────
  //  Métodos internos — llamados desde el API Gateway
  //  (el gateway los expone como HTTP REST al frontend)
  // ─────────────────────────────────────────────

  @GrpcMethod('AuthService', 'Register')
  register(data: RegisterRequest) {
    return this.authService.register(data);
  }

  @GrpcMethod('AuthService', 'Login')
  login(data: LoginRequest) {
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  async refreshToken(data: { refreshToken: string }) {
    return this.authService.refreshToken(data.refreshToken);
  }

  @GrpcMethod('AuthService', 'Logout')
  async logout(data: { refreshToken: string }) {
    return this.authService.logout(data.refreshToken);
  }

  @GrpcMethod('AuthService', 'LogoutAll')
  async logoutAll(data: { userId: string }) {
    return this.authService.logoutAll(data.userId);
  }

  @GrpcMethod('AuthService', 'ForgotPassword')
  forgotPassword(data: ForgotPasswordRequest) {
    return this.authService.forgotPassword(data);
  }

  @GrpcMethod('AuthService', 'ResetPassword')
  resetPassword(data: ResetPasswordRequest) {
    return this.authService.resetPassword(data);
  }
}