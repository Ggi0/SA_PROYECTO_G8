import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
    raw: string | JwtPayload;
  };
};

@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const secret = process.env.JWT_SECRET || 'local_dev_secret';

    try {
      const payload = jwt.verify(token, secret) as JwtPayload;
      const id = String(payload.sub || payload.id || payload.userId || '');
      if (!id) {
        throw new UnauthorizedException('JWT does not include user id');
      }

      request.user = {
        id,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        raw: payload,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
