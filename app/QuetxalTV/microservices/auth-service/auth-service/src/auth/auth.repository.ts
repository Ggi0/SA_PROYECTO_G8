// src/auth/auth.repository.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationToken } from './entities/verification-token.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,

    @InjectRepository(VerificationToken)
    private readonly verificationTokenRepo: Repository<VerificationToken>,

    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────
  //  USUARIOS
  // ─────────────────────────────────────────────

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { userId } });
  }

  async findByIdWithProfiles(userId: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { userId },
    relations: {
      profiles: true,
    },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.userRepo.count({ where: { email } });
    return count > 0;
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await this.userRepo.increment({ userId }, 'tokenVersion', 1);
  }

  async activateUser(userId: string): Promise<void> {
    await this.userRepo.update({ userId }, { isActive: true });
  }

  async updateLastLogin(userId: string): Promise<void> {
  await this.userRepo.update(
    { userId },
    {
      lastLoginAt: new Date(),
    },
  );
}

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    // El trigger trg_audit_password_change registra esto automáticamente
    await this.userRepo.update({ userId }, { passwordHash });
  }

  // ─────────────────────────────────────────────
  //  STORED PROCEDURE — Registro
  //  Llama sp_register_user que en una sola transacción:
  //  1. Crea el usuario (hashea password con pgcrypto)
  //  2. Crea el perfil inicial
  //  3. Registra en audit_log
  // ─────────────────────────────────────────────
  async registerUser(params: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<{ userId: string; profileId: string }> {
    const result = await this.dataSource.query(
      `CALL auth.sp_register_user($1, $2, $3, NULL, NULL, NULL, NULL)`,
      [params.email, params.password, params.displayName],
    );

    // PostgreSQL devuelve los OUT params en el primer resultado
    const row = result[0];
    return {
      userId:    row.p_user_id,
      profileId: row.p_profile_id,
    };
  }

  // ─────────────────────────────────────────────
  //  VERIFICACIÓN DE CONTRASEÑA
  //  Usa fn_verify_password de pgcrypto (nunca trae el hash)
  // ─────────────────────────────────────────────
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT auth.fn_verify_password($1, $2) AS valid`,
      [email, password],
    );
    return result[0]?.valid === true;
  }

  // ─────────────────────────────────────────────
  //  VISTA — Resumen de usuario + perfiles
  //  Usada al hacer login para construir el payload completo
  // ─────────────────────────────────────────────
  async getUserProfilesSummary(userId: string): Promise<{
    userId: string;
    email: string;
    oauthProvider: string | null;
    isActive: boolean;
    profiles: Array<{
      profileId: string;
      displayName: string;
      avatarUrl: string | null;
      isKidsMode: boolean;
    }>;
  } | null> {
    const result = await this.dataSource.query(
      `SELECT * FROM auth.v_user_profiles_summary WHERE user_id = $1`,
      [userId],
    );

    if (!result.length) return null;

    const row = result[0];
    return {
      userId:        row.user_id,
      email:         row.email,
      oauthProvider: row.oauth_provider,
      isActive:      row.is_active,
      profiles:      row.profiles ?? [],
    };
  }

  // ─────────────────────────────────────────────
  //  REFRESH TOKENS
  // ─────────────────────────────────────────────

  async saveRefreshToken(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
  }): Promise<void> {
    const token = this.refreshTokenRepo.create({
      userId:     params.userId,
      tokenHash:  params.tokenHash,
      expiresAt:  params.expiresAt,
      deviceInfo: params.deviceInfo ?? null,
      ipAddress:  params.ipAddress ?? null,
    });
    await this.refreshTokenRepo.save(token);
  }

  async findActiveRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepo.findOne({
      where: {
        tokenHash,
        revoked: false,
      },
    });
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.refreshTokenRepo.update({ tokenHash }, { revoked: true });
  }

  // Stored procedure — invalida todos los refresh tokens del usuario
  // y escribe en audit_log automáticamente
  async revokeAllTokens(userId: string): Promise<void> {
    await this.dataSource.query(
      `CALL auth.sp_revoke_all_tokens($1)`,
      [userId],
    );
  }

  // ─────────────────────────────────────────────
  //  VERIFICATION TOKENS  (email de activación / reset)
  // ─────────────────────────────────────────────

  async saveVerificationToken(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    const token = this.verificationTokenRepo.create({
      userId:    params.userId,
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
    });
    await this.verificationTokenRepo.save(token);
  }

  async findValidVerificationToken(
    tokenHash: string,
  ): Promise<VerificationToken | null> {
    return this.verificationTokenRepo
      .createQueryBuilder('vt')
      .where('vt.tokenHash = :hash', { hash: tokenHash })
      .andWhere('vt.used = false')
      .andWhere('vt.expiresAt > NOW()')
      .getOne();
  }

  async markVerificationTokenUsed(tokenHash: string): Promise<void> {
    await this.verificationTokenRepo.update({ tokenHash }, { used: true });
  }

  // Limpia tokens de verificación viejos del usuario antes de emitir uno nuevo
  async invalidatePreviousVerificationTokens(userId: string): Promise<void> {
    await this.verificationTokenRepo.update(
      { userId, used: false },
      { used: true },
    );
  }

  // Expone DataSource.query para casos puntuales donde TypeORM no es suficiente
  // (p.ej. UPDATE usando crypt() de pgcrypto directamente)
  async dataSourceQuery(sql: string, params?: unknown[]): Promise<unknown[]> {
    return this.dataSource.query(sql, params);
  }
 
}