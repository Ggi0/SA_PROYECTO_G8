import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { SubscriptionService } from '../subscription/subscription.service';
import type { AuthRequest } from '../common/guards/auth-jwt.guard';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const userId = req.authUser?.userId;
    if (!userId) return false;

    let sub: Record<string, unknown>;
    try {
      sub = await lastValueFrom(
        this.subscriptionService.getUserSubscription(userId) as any,
      ) as Record<string, unknown>;
    } catch {
      throw new ForbiddenException(
        'No se pudo verificar la suscripción. Solo usuarios Premium pueden crear Watch Party.',
      );
    }

    // La respuesta gRPC viene en camelCase (NestJS serialization)
    const planName = String(sub?.planName ?? sub?.plan_name ?? '').toLowerCase();
    const hasActive = Boolean(sub?.hasActiveSubscription ?? sub?.has_active_subscription);
    const status = String(sub?.status ?? '');

    if (!hasActive || status !== 'ACTIVE' || !planName.includes('premium')) {
      throw new ForbiddenException(
        'Solo usuarios con Plan Premium pueden crear una sala de Watch Party.',
      );
    }

    return true;
  }
}
