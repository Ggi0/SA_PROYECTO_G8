// src/auth/auth.controller.ts

import { Controller, NotFoundException } from '@nestjs/common';
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
  register(data: any) {
    console.log('RAW DATA RECEIVED:', JSON.stringify(data));  // agrega esto temporalmente
    // NestJS gRPC convierte display_name → displayName automáticamente
    // pero a veces dependiendo de la versión llega como display_name
    // Usar ambos como fallback:

    const displayName = 
    data.displayName     ||   // camelCase (keepCase: false — default)
    data.display_name    ||   // snake_case (keepCase: true)
    '';

    return this.authService.register({
      email:       data.email,
      password:    data.password,
      displayName,
    });
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


  @GrpcMethod('AuthService', 'GetMe')
  async getMe(data: { userId: string; activeProfileId: string }) {
    return this.authService.getMe(data.userId, data.activeProfileId || null);
  }
 
  @GrpcMethod('AuthService', 'ChangePassword')
  async changePassword(data: {
    userId:          string;
    currentPassword: string;
    newPassword:     string;
  }) {
    return this.authService.changePassword(data);
  }
 
  @GrpcMethod('AuthService', 'GetUserById')
  async getUserById(data: { userId: string }) {
    const user = await this.authService['authRepository'].findById(data.userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return {
      userId:   user.userId,
      email:    user.email,
      role:     user.role,
      isActive: user.isActive,
    };
  }


}