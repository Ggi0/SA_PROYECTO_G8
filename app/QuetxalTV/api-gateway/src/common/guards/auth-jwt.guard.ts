// src/common/guards/auth-jwt.guard.ts
//
// Guard dedicado al módulo auth del gateway.
// Lee el mismo JWT que emite el Auth Service con el payload completo:
//   { sub, email, role, tokenVersion, activeProfileId }
//
// NO reemplaza jwt.guard.ts que ya está en uso por otros módulos
// (subscription, etc.). Ambos conviven sin conflicto.
//
// USO:
//   @UseGuards(AuthJwtGuard)   ← en rutas protegidas de auth/
//
// Diferencias con jwt.guard.ts existente:
//   - Usa JWT_ACCESS_SECRET (del Auth Service) en vez de JWT_SECRET
//   - Adjunta payload completo: userId, email, role, activeProfileId, tokenVersion
//   - Tipo de request extendido con AuthUser para type-safety

import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { Request } from 'express';
  import * as jwt from 'jsonwebtoken';
  
  export interface AuthUser {
    userId:          string;
    email:           string;
    role:            string;
    activeProfileId: string | null;
    tokenVersion:    number;
  }
  
  export type AuthRequest = Request & { authUser: AuthUser };
  
  @Injectable()
  export class AuthJwtGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<AuthRequest>();
      const authHeader = req.headers.authorization;
  
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing bearer token');
      }
  
      const token  = authHeader.slice('Bearer '.length).trim();
      // JWT_ACCESS_SECRET debe coincidir con el valor en el Auth Service
      const secret = process.env.JWT_ACCESS_SECRET || 'super_access_secret_cambiala';
  
      try {
        const payload = jwt.verify(token, secret) as jwt.JwtPayload;
  
        const userId = String(payload['sub'] || '');
        if (!userId) throw new UnauthorizedException('JWT does not include user id');
  
        req.authUser = {
          userId,
          email:           payload['email']           ?? '',
          role:            payload['role']             ?? 'client',
          activeProfileId: payload['activeProfileId'] ?? null,
          tokenVersion:    payload['tokenVersion']    ?? 1,
        };
  
        return true;
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        throw new UnauthorizedException('Invalid or expired token');
      }
    }
  }