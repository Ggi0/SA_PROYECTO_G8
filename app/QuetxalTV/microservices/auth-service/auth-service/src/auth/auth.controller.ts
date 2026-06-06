import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // =========================
  // AUTH
  // =========================

  @GrpcMethod('AuthService', 'Register')
  register(data: { email: string; password: string }) {
    return this.authService.register(data);
  }

  @GrpcMethod('AuthService', 'Login')
  login(data: { email: string; password: string }) {
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  validateToken(data: { access_token: string }) {
    return this.authService.validateToken(data);
  }

  @GrpcMethod('AuthService', 'Logout')
  logout(data: { user_id: string }) {
    return this.authService.logout(data);
  }

  // =========================
  // PASSWORD
  // =========================

  @GrpcMethod('AuthService', 'ChangePassword')
  changePassword(data: {
    user_id: string;
    old_password: string;
    new_password: string;
  }) {
    return this.authService.changePassword(data);
  }

  @GrpcMethod('AuthService', 'RequestPasswordReset')
  requestPasswordReset(data: { email: string }) {
    return this.authService.requestPasswordReset(data);
  }

  @GrpcMethod('AuthService', 'ResetPassword')
  resetPassword(data: { token: string; new_password: string }) {
    return this.authService.resetPassword(data);
  }

  // =========================
  // PROFILES
  // =========================

  @GrpcMethod('AuthService', 'CreateProfile')
  createProfile(data: { user_id: string; name: string }) {
    return this.authService.createProfile(data);
  }

  @GrpcMethod('AuthService', 'GetProfiles')
  getProfiles(data: { user_id: string }) {
    return this.authService.getProfiles(data);
  }
}