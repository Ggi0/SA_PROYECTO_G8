import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { CancelSubscriptionDto, SubscribeDto } from './dto/subscribe.dto';

interface SubscriptionGrpcService {
  getPlans(data: Record<string, never>): Observable<unknown>;
  getPlanById(data: { planId: string }): Observable<unknown>;
  getPlansWithRates(data: { currency: string; userId: string }): Observable<unknown>;
  subscribe(data: { userId: string; planId: string; currency: string; paymentMethod: string }): Observable<unknown>;
  cancelSubscription(data: { userId: string; reason: string }): Observable<unknown>;
  getUserSubscription(data: { userId: string }): Observable<unknown>;
  getPaymentHistory(data: { userId: string; limit: number; offset: number }): Observable<unknown>;
}

@Injectable()
export class SubscriptionService implements OnModuleInit {
  private grpcClient!: SubscriptionGrpcService;

  constructor(@Inject('SUBSCRIPTION_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.grpcClient = this.client.getService<SubscriptionGrpcService>('SubscriptionService');
  }

  getPlans() {
    return this.grpcClient.getPlans({});
  }

  getPlanById(planId: string) {
    return this.grpcClient.getPlanById({ planId });
  }

  getPlansWithRates(currency: string | undefined, userId: string) {
    return this.grpcClient.getPlansWithRates({ currency: currency || 'USD', userId });
  }

  subscribe(userId: string, dto: SubscribeDto) {
    return this.grpcClient.subscribe({
      userId,
      planId: dto.planId,
      currency: dto.currency || 'USD',
      paymentMethod: dto.paymentMethod || 'unknown',
    });
  }

  cancelSubscription(userId: string, dto: CancelSubscriptionDto) {
    return this.grpcClient.cancelSubscription({
      userId,
      reason: dto.reason || 'Cancelado por el usuario',
    });
  }

  getUserSubscription(userId: string) {
    return this.grpcClient.getUserSubscription({ userId });
  }

  getPaymentHistory(userId: string, limit = 10, offset = 0) {
    return this.grpcClient.getPaymentHistory({ userId, limit, offset });
  }
}
