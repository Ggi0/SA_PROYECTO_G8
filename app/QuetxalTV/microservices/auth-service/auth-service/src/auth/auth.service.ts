// src/auth/auth.service.ts

import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { JwtService } from '../JWT/jwt.service';
import { NotificationClient } from '../notification/notification.client';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ValidateTokenRequest,
  ValidateTokenResponse,
} from './auth.contract';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly notificationClient: NotificationClient,
  ) {}

  // ─────────────────────────────────────────────
  //  REGISTRO
  // ─────────────────────────────────────────────
  async register(req: RegisterRequest): Promise<RegisterResponse> {
    console.log('MICROSERVICE REGISTER REQ=', JSON.stringify(req, null, 2));
console.log('displayName=', (req as any).displayName);
console.log('display_name=', (req as any).display_name);

    const exists = await this.authRepository.existsByEmail(req.email);
    if (exists) {
      throw new ConflictException('El correo ya está registrado.');
    }

    // El stored procedure crea usuario + perfil inicial + audit_log en una tx
    const { userId, profileId } = await this.authRepository.registerUser({
      email:       req.email,
      password:    req.password,
      displayName: req.displayName,
    });
    await this.authRepository.activateUser(userId);

    this.logger.log(`Usuario registrado: ${userId}`);

    // ── INTEGRACIÓN FUTURA — Notification Service ────────────────
    // Cuando el Notification Service esté disponible, reemplazar este
   // ── Notification Service — Welcome Email ─────────────────────
  try {
      await this.notificationClient.sendWelcomeEmail({
        user_id:    userId,
        user_email: req.email,
        user_name:  req.displayName,
      });
    } catch (err: unknown) {
      this.logger.warn(`Email de bienvenida no enviado: ${(err as Error).message}`);
    }
    // ────────────────────────────────────────────────────────────
    return {
      userId,
      profileId,
      message: 'Usuario registrado correctamente.',
    };
  }

  // ─────────────────────────────────────────────
  //  LOGIN
  // ─────────────────────────────────────────────
  async login(req: LoginRequest): Promise<LoginResponse> {
    // 1. Verificar credenciales con fn_verify_password (pgcrypto en la DB)
    const valid = await this.authRepository.verifyPassword(
      req.email,
      req.password,
    );
    if (!valid) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    // 2. Obtener usuario (necesitamos user_id, role, token_version)
    const user = await this.authRepository.findByEmail(req.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Cuenta no activada. Revisa tu correo.',
      );
    }

    // Registrar el último inicio de sesión exitoso
    await this.authRepository.updateLastLogin(user.userId);

    // 3. Obtener resumen de perfiles desde la vista
    const summary = await this.authRepository.getUserProfilesSummary(user.userId);

    // 4. Emitir tokens
    const { accessToken, refreshToken, refreshTokenHash, expiresIn } =
      this.jwtService.issueTokenPair({
        sub:             user.userId,
        email:           user.email,
        role:            user.role,
        tokenVersion:    user.tokenVersion,
        activeProfileId: null,
      });

    // 5. Persistir refresh token (solo el hash)
    await this.authRepository.saveRefreshToken({
      userId:     user.userId,
      tokenHash:  refreshTokenHash,
      expiresAt:  this.jwtService.refreshTokenExpiresAt(),
      deviceInfo: req.deviceInfo,
      ipAddress:  req.ipAddress,
    });

    this.logger.log(`Login exitoso: ${user.userId}`);

    return {
      accessToken,
      expiresIn,
      refreshToken, // el gateway lo pone en cookie HttpOnly
      user: {
        userId: user.userId,
        email:  user.email,
        role:   user.role,
      },
      profiles:        summary?.profiles ?? [],
      activeProfileId: null,
    };
  }

  // ─────────────────────────────────────────────
  //  REFRESH TOKEN
  // ─────────────────────────────────────────────
  async refreshToken(rawToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
    activeProfileId: string | null;
  }> {
    const tokenHash = this.jwtService.hashToken(rawToken);

    const stored = await this.authRepository.findActiveRefreshToken(tokenHash);
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado.');
    }

    const user = await this.authRepository.findById(stored.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no disponible.');
    }

    // Rotación: invalidar el token actual y emitir uno nuevo
    await this.authRepository.revokeRefreshToken(tokenHash);

    const { accessToken, refreshToken: newRaw, refreshTokenHash, expiresIn } =
      this.jwtService.issueTokenPair({
        sub:             user.userId,
        email:           user.email,
        role:            user.role,
        tokenVersion:    user.tokenVersion,
        activeProfileId: null, // el perfil activo lo refresca el frontend llamando a /perfil/select
      });

    await this.authRepository.saveRefreshToken({
      userId:    user.userId,
      tokenHash: refreshTokenHash,
      expiresAt: this.jwtService.refreshTokenExpiresAt(),
      ipAddress: stored.ipAddress ?? undefined,
    });

    return { accessToken, expiresIn, activeProfileId: null };
  }

  // ─────────────────────────────────────────────
  //  LOGOUT (sesión individual)
  // ─────────────────────────────────────────────
  async logout(rawToken: string): Promise<{ message: string }> {
    const tokenHash = this.jwtService.hashToken(rawToken);
    await this.authRepository.revokeRefreshToken(tokenHash);
    return { message: 'Sesión cerrada.' };
  }

  // ─────────────────────────────────────────────
  //  LOGOUT GLOBAL (todos los dispositivos)
  // ─────────────────────────────────────────────
  async logoutAll(userId: string): Promise<{ message: string }> {
    // sp_revoke_all_tokens hace UPDATE + audit_log en una sola tx
    await this.authRepository.revokeAllTokens(userId);
    // Incrementar token_version invalida todos los JWT emitidos hasta ahora
    await this.authRepository.incrementTokenVersion(userId);
    return { message: 'Todas las sesiones cerradas.' };
  }

  // ─────────────────────────────────────────────
  //  FORGOT PASSWORD
  // ─────────────────────────────────────────────
  async forgotPassword(
    req: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResponse> {
    // Respuesta siempre igual para no revelar si el email existe
    const SAFE_RESPONSE = {
      message: 'Si el correo está registrado, recibirás las instrucciones.',
    };

    const user = await this.authRepository.findByEmail(req.email);
    if (!user) return SAFE_RESPONSE;

    // Invalidar tokens anteriores para evitar múltiples válidos
    await this.authRepository.invalidatePreviousVerificationTokens(user.userId);

    const { raw, hash } = this.jwtService.generateVerificationToken();
    await this.authRepository.saveVerificationToken({
      userId:    user.userId,
      tokenHash: hash,
      expiresAt: this.jwtService.verificationTokenExpiresAt(),
    });

    // ── INTEGRACIÓN FUTURA — Notification Service ────────────────
    // try {
    //   await this.notificationClient.sendPasswordReset({
    //     userId:    user.userId,
    //     email:     user.email,
    //     resetToken: raw,          // el svc construye la URL con este token
    //     expiresIn: 86400,         // 24 horas
    //   });
    // } catch (err) {
    //   this.logger.error(`Error enviando email de reset: ${err.message}`);
    // }
    //
    // Por ahora: loguear el token raw para desarrollo local.
    // REMOVER en producción.
    this.logger.debug(`[DEV] Token de reset para ${user.email}: ${raw}`);
    // ────────────────────────────────────────────────────────────

    return SAFE_RESPONSE;
  }

  // ─────────────────────────────────────────────
  //  RESET PASSWORD
  // ─────────────────────────────────────────────
  async resetPassword(req: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const tokenHash = this.jwtService.hashToken(req.token);

    const vt = await this.authRepository.findValidVerificationToken(tokenHash);
    if (!vt) {
      throw new BadRequestException('Token inválido o expirado.');
    }

    // La función fn_verify_password de la DB hashea con pgcrypto.
    // Aquí necesitamos pasar la contraseña en plano para que updatePassword
    // la hashee via la función de la DB.
    // NOTA: updatePassword llama directamente a un UPDATE de TypeORM,
    // pero la password ya hasheda es responsabilidad del SP.
    // Hacemos el hash aquí usando la función de la DB para consistencia:
    const user = await this.authRepository.findById(vt.userId);
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    // Actualizar password — el trigger trg_audit_password_change registra el evento
    // El hash se genera usando pgcrypto en la DB directamente
    await this.authRepository.dataSourceQuery(
      `UPDATE auth.users SET password_hash = crypt($1, gen_salt('bf', 12)) WHERE user_id = $2`,
      [req.newPassword, user.userId],
    );

    // Marcar token como usado
    await this.authRepository.markVerificationTokenUsed(tokenHash);

    // Revocar todas las sesiones activas (buena práctica tras reset de contraseña)
    await this.authRepository.revokeAllTokens(user.userId);

    return { message: 'Contraseña actualizada correctamente.' };
  }


  async getMe(userId: string, activeProfileId: string | null) {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return {
      user: {
        userId: user.userId,
        email:  user.email,
        role:   user.role,
      },
      activeProfileId: activeProfileId ?? null,
    };
  }
 
  async changePassword(params: {
    userId:          string;
    currentPassword: string;
    newPassword:     string;
  }): Promise<{ message: string }> {
    const user = await this.authRepository.findByEmail(
      (await this.authRepository.findById(params.userId))!.email,
    );
    if (!user) throw new NotFoundException('Usuario no encontrado.');
 
    const valid = await this.authRepository.verifyPassword(
      user.email,
      params.currentPassword,
    );
    if (!valid) {
      throw new UnauthorizedException('Contraseña actual incorrecta.');
    }
 
    // Hashear con pgcrypto en la DB — el trigger registra el cambio en audit_log
    await this.authRepository.dataSourceQuery(
      `UPDATE auth.users SET password_hash = crypt($1, gen_salt('bf', 12)) WHERE user_id = $2`,
      [params.newPassword, params.userId],
    );
 
    // Revocar todas las sesiones activas por seguridad
    await this.authRepository.revokeAllTokens(params.userId);
 
    return { message: 'Contraseña actualizada correctamente.' };
  }

  // ─────────────────────────────────────────────
  //  VALIDAR TOKEN  (usado por otros micros vía gRPC)
  // ─────────────────────────────────────────────
  validateToken(req: ValidateTokenRequest): ValidateTokenResponse {
    try {
      const payload = this.jwtService.verifyAccessToken(req.accessToken);

      return {
        valid:           true,
        userId:          payload.sub,
        email:           payload.email,
        role:            payload.role,
        activeProfileId: payload.activeProfileId,
      };
    } catch {
      return {
        valid:           false,
        userId:          '',
        email:           '',
        role:            '',
        activeProfileId: null,
      };
    }
  }
}
