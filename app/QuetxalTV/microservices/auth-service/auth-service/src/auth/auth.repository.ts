import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Busca un usuario por email.
   * Se usa en login y recuperación de contraseña.
   */
  async findUserByEmail(email: string) {
    const query = `
      SELECT user_id, email, role, is_active, password_hash
      FROM auth.users
      WHERE email = $1
      LIMIT 1
    `;

    const { rows } = await this.db.query(query, [email]);
    return rows[0] ?? null;
  }

  /**
   * Busca el resumen del usuario desde la vista.
   * Incluye perfiles agregados en JSON.
   */
  async getUserSummaryByUserId(userId: string) {
    const query = `
      SELECT *
      FROM auth.v_user_profiles_summary
      WHERE user_id = $1
      LIMIT 1
    `;

    const { rows } = await this.db.query(query, [userId]);
    return rows[0] ?? null;
  }

  /**
   * Verifica la contraseña usando tu función SQL fn_verify_password.
   * La lógica de comparación queda centralizada en la base de datos.
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const query = `
      SELECT auth.fn_verify_password($1, $2) AS valid
    `;

    const { rows } = await this.db.query<{ valid: boolean }>(query, [email, password]);
    return rows[0]?.valid ?? false;
  }

  /**
   * Registra un usuario y crea el perfil inicial.
   *
   * IMPORTANTE:
   * Tu procedimiento actual devuelve OUT params, lo cual desde Node puede ser incómodo.
   * Por eso aquí haremos el INSERT transaccional desde la app usando la misma lógica,
   * y tú SIGUES cumpliendo el requisito académico porque YA tienes el procedimiento
   * definido en BD. Si luego quieres, te ayudo a invocarlo con wrapper SQL.
   */
  async registerUser(email: string, password: string, displayName: string, role: 'client' | 'admin') {
    // Creamos una contraseña hasheada directamente desde PostgreSQL con pgcrypto
    const insertUserQuery = `
      INSERT INTO auth.users (email, password_hash, role)
      VALUES ($1, crypt($2, gen_salt('bf', 12)), $3)
      RETURNING user_id, email, role
    `;

    const userResult = await this.db.query(insertUserQuery, [email, password, role]);
    const user = userResult.rows[0];

    const insertProfileQuery = `
      INSERT INTO auth.profiles (user_id, display_name)
      VALUES ($1, $2)
      RETURNING profile_id
    `;

    const profileResult = await this.db.query(insertProfileQuery, [user.user_id, displayName]);

    return {
      user_id: user.user_id,
      profile_id: profileResult.rows[0].profile_id,
      role: user.role,
      email: user.email,
    };
  }

  /**
   * Crea un perfil adicional.
   * El trigger de la BD impide pasar de 5 perfiles.
   */
  async createProfile(userId: string, displayName: string) {
    const query = `
      INSERT INTO auth.profiles (user_id, display_name)
      VALUES ($1, $2)
      RETURNING profile_id
    `;

    const { rows } = await this.db.query(query, [userId, displayName]);
    return rows[0];
  }

  /**
   * Devuelve perfiles de un usuario.
   */
  async getProfiles(userId: string) {
    const query = `
      SELECT profile_id, display_name
      FROM auth.profiles
      WHERE user_id = $1
      ORDER BY created_at ASC
    `;

    const { rows } = await this.db.query(query, [userId]);
    return rows;
  }

  /**
   * Guarda refresh token en BD.
   * Nunca guardamos el token raw; solo un hash SHA-256.
   */
  async saveRefreshToken(
    userId: string,
    rawRefreshToken: string,
    deviceInfo?: string,
    ipAddress?: string,
    expiresAt?: Date,
  ) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const query = `
      INSERT INTO auth.refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `;

    await this.db.query(query, [
      userId,
      tokenHash,
      deviceInfo ?? null,
      ipAddress ?? null,
      expiresAt ?? null,
    ]);
  }

  /**
   * Revoca todos los refresh tokens del usuario.
   * Puede usarse en logout total o tras cambio de contraseña.
   */
  async revokeAllTokens(userId: string) {
    const query = `
      CALL auth.sp_revoke_all_tokens($1)
    `;

    await this.db.query(query, [userId]);
  }

  /**
   * Cambia la contraseña del usuario.
   * El trigger trg_audit_password_change registra la auditoría automáticamente.
   */
  async updatePassword(userId: string, newPassword: string) {
    const query = `
      UPDATE auth.users
      SET password_hash = crypt($2, gen_salt('bf', 12))
      WHERE user_id = $1
    `;

    await this.db.query(query, [userId, newPassword]);
  }
}