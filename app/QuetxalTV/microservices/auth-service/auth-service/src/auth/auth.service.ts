import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { AuthRepository } from './auth.repository';
import { JwtPayload } from '../common/types/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Determina si el correo debe registrarse como admin.
   * La lista de correos admin viene desde .env
   */
  private resolveRole(email: string): 'client' | 'admin' {
    const adminEmails =
      this.configService.get<string>('ADMIN_EMAILS')?.split(',').map((e) => e.trim()) ?? [];

    return adminEmails.includes(email) ? 'admin' : 'client';
  }

  /**
   * Genera el access token con payload estándar.
   */
  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: parseInt(this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '900', 10),
    });
  }

  /**
   * Genera refresh token.
   * Aquí lo hacemos como un token aleatorio opaco.
   * Se guarda hasheado en base de datos.
   */
  private generateRefreshToken(): string {
    return randomBytes(48).toString('hex');
  }

  /**
   * Convierte el tiempo JWT_REFRESH_EXPIRES_IN a una fecha aproximada.
   * Aquí lo dejaremos fijo a 7 días para simplificar.
   */
  private getRefreshTokenExpirationDate(): Date {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    return now;
  }

  /**
   * Registro de usuario.
   * Crea cuenta + perfil inicial + genera tokens.
   */
  async register(data: { email: string; password: string }) {
    const { email, password } = data;

    if (!email || !password) {
      throw new BadRequestException('Email y password son obligatorios.');
    }

    const existingUser = await this.authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new BadRequestException('El correo ya está registrado.');
    }

    // Si tu proto no recibe display_name, usamos uno por defecto derivado del email
    const displayName = email.split('@')[0];

    // El role se decide por configuración
    const role = this.resolveRole(email);

    const registeredUser = await this.authRepository.registerUser(
      email,
      password,
      displayName,
      role,
    );

    const payload: JwtPayload = {
      sub: registeredUser.user_id,
      email: registeredUser.email,
      role,
    };

    const accessToken = this.generateAccessToken(payload);

    const refreshToken = this.generateRefreshToken();

    await this.authRepository.saveRefreshToken(
      registeredUser.user_id,
      refreshToken,
      'initial-register',
      undefined,
      this.getRefreshTokenExpirationDate(),
    );

    return {
      user_id: registeredUser.user_id,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Login:
   * - busca usuario
   * - verifica password
   * - genera JWT
   * - guarda refresh token
   */
  async login(data: { email: string; password: string }) {
    const { email, password } = data;

    if (!email || !password) {
      throw new BadRequestException('Email y password son obligatorios.');
    }

    const user = await this.authRepository.findUserByEmail(email);
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isPasswordValid = await this.authRepository.verifyPassword(email, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const summary = await this.authRepository.getUserSummaryByUserId(user.user_id);

    const payload: JwtPayload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken();

    await this.authRepository.saveRefreshToken(
      user.user_id,
      refreshToken,
      'login-session',
      undefined,
      this.getRefreshTokenExpirationDate(),
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Valida un access token.
   * Este método es útil para pruebas internas o escenarios concretos.
   * Pero en producción el API Gateway idealmente validará el JWT localmente.
   */
  async validateToken(data: { access_token: string }) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(data.access_token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      return {
        user_id: payload.sub,
        valid: true,
      };
    } catch (error) {
      return {
        user_id: '',
        valid: false,
      };
    }
  }

  /**
   * Logout total.
   * Revoca todos los refresh tokens del usuario.
   */
  async logout(data: { user_id: string }) {
    await this.authRepository.revokeAllTokens(data.user_id);

    return {
      success: true,
    };
  }

  /**
   * Cambio de contraseña:
   * - verifica password actual
   * - cambia contraseña
   * - revoca todas las sesiones
   */
  async changePassword(data: {
    user_id: string;
    old_password: string;
    new_password: string;
  }) {
    const summary = await this.authRepository.getUserSummaryByUserId(data.user_id);
    if (!summary) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const validOldPassword = await this.authRepository.verifyPassword(
      summary.email,
      data.old_password,
    );

    if (!validOldPassword) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    await this.authRepository.updatePassword(data.user_id, data.new_password);

    // Al cambiar contraseña, cerramos sesiones activas
    await this.authRepository.revokeAllTokens(data.user_id);

    return {
      success: true,
    };
  }

  /**
   * Solicita reset de contraseña usando JWT de propósito específico.
   * Para no exponer si un correo existe o no, siempre retorna success: true.
   *
   * Más adelante este token se enviará por Notification Service.
   */
  async requestPasswordReset(data: { email: string }) {
    const user = await this.authRepository.findUserByEmail(data.email);

    if (user) {
      const resetToken = this.jwtService.sign(
        {
          sub: user.user_id,
          email: user.email,
          purpose: 'password_reset',
        },
        {
          secret: this.configService.get<string>('JWT_RESET_SECRET'),
          expiresIn: parseInt(this.configService.get<string>('JWT_RESET_EXPIRES_IN') ?? '900', 10),        },
      );

      // En desarrollo lo mostramos en logs.
      // Luego esto se reemplaza con llamada gRPC a Notification Service.
      const logToken = this.configService.get<string>('LOG_RESET_TOKEN_IN_DEV') === 'true';
      if (logToken) {
        console.log('RESET TOKEN (solo desarrollo):', resetToken);
      }
    }

    return {
      success: true,
    };
  }

  /**
   * Resetea contraseña usando el reset token.
   */
  async resetPassword(data: { token: string; new_password: string }) {
    try {
      const payload = this.jwtService.verify<any>(data.token, {
        secret: this.configService.get<string>('JWT_RESET_SECRET'),
      });

      if (payload.purpose !== 'password_reset') {
        throw new UnauthorizedException('Token inválido para reset.');
      }

      await this.authRepository.updatePassword(payload.sub, data.new_password);
      await this.authRepository.revokeAllTokens(payload.sub);

      return {
        success: true,
      };
    } catch (error) {
      throw new UnauthorizedException('Token de recuperación inválido o expirado.');
    }
  }

  /**
   * Crea perfil adicional.
   * La BD se encarga de impedir más de 5 mediante trigger.
   */
  async createProfile(data: { user_id: string; name: string }) {
    if (!data.user_id || !data.name) {
      throw new BadRequestException('user_id y name son obligatorios.');
    }

    const profile = await this.authRepository.createProfile(data.user_id, data.name);

    return {
      profile_id: profile.profile_id,
    };
  }

  /**
   * Devuelve todos los perfiles del usuario.
   */
  async getProfiles(data: { user_id: string }) {
    const profiles = await this.authRepository.getProfiles(data.user_id);

    return {
      profiles: profiles.map((profile) => ({
        id: profile.profile_id,
        name: profile.display_name,
      })),
    };
  }
}