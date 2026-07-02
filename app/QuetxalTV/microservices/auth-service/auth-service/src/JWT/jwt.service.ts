// src/JWT/jwt.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// ─────────────────────────────────────────────
//  Payload que vive dentro del access token
// ─────────────────────────────────────────────
export interface JwtPayload {
  sub: string;              // user_id
  email: string;
  role: 'client' | 'admin';
  tokenVersion: number;     // para invalidación masiva
  activeProfileId: string | null;
  maxRating?: string;       // clasificación máxima permitida (control parental)
  iat?: number;
  exp?: number;
}

// ─────────────────────────────────────────────
//  Resultado de emitir un par de tokens
// ─────────────────────────────────────────────
export interface TokenPair {
  accessToken: string;
  refreshToken: string;      // token raw — guardar solo el hash en DB
  refreshTokenHash: string;  // SHA-256 del refresh token
  expiresIn: number;         // segundos hasta expiración del access token
}

@Injectable()
export class JwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: number;   // segundos
  private readonly refreshExpiresIn: number;  // segundos

  constructor(private readonly configService: ConfigService) {
    this.accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    // Defaults: 15 min access, 30 días refresh
    this.accessExpiresIn = parseInt(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '900'),
    );
    this.refreshExpiresIn = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '2592000'),
    );
  }

  // ─────────────────────────────────────────────
  //  Emitir access token
  // ─────────────────────────────────────────────
  signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
    });
  }

  // ─────────────────────────────────────────────
  //  Emitir refresh token (opaco, 64 bytes hex)
  //  Devuelve el raw + su hash SHA-256.
  //  La DB solo almacena el hash.
  // ─────────────────────────────────────────────
  generateRefreshToken(): { raw: string; hash: string } {
    const raw = crypto.randomBytes(64).toString('hex');
    const hash = this.hashToken(raw);
    return { raw, hash };
  }

  // ─────────────────────────────────────────────
  //  Emitir par completo (login / refresh)
  // ─────────────────────────────────────────────
  issueTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenPair {
    const accessToken = this.signAccessToken(payload);
    const { raw: refreshToken, hash: refreshTokenHash } =
      this.generateRefreshToken();

    return {
      accessToken,
      refreshToken,
      refreshTokenHash,
      expiresIn: this.accessExpiresIn,
    };
  }

  // ─────────────────────────────────────────────
  //  Verificar access token
  // ─────────────────────────────────────────────
  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.accessSecret) as JwtPayload;
  }

  // ─────────────────────────────────────────────
  //  Fecha de expiración para el refresh token
  // ─────────────────────────────────────────────
  refreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.refreshExpiresIn * 1000);
  }

  // ─────────────────────────────────────────────
  //  Hash determinístico — igual entrada, igual salida
  //  Permite buscar el token en la DB sin guardarlo en texto plano
  // ─────────────────────────────────────────────
  hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  // ─────────────────────────────────────────────
  //  Token de verificación de correo (UUID + expiración)
  // ─────────────────────────────────────────────
  generateVerificationToken(): { raw: string; hash: string } {
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = this.hashToken(raw);
    return { raw, hash };
  }

  verificationTokenExpiresAt(): Date {
    // 24 horas para confirmar el correo
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}