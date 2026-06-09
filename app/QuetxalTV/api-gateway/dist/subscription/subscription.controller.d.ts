import type { Request } from 'express';
import { CancelSubscriptionDto, SubscribeDto } from './dto/subscribe.dto';
import { SubscriptionService } from './subscription.service';
type AuthenticatedRequest = Request & {
    user: {
        id: string;
    };
};
export declare class SubscriptionController {
    private readonly subscriptionService;
    constructor(subscriptionService: SubscriptionService);
    getPlans(): import("rxjs").Observable<unknown>;
    getPlansWithRates(currency: string | undefined, req: AuthenticatedRequest): import("rxjs").Observable<unknown>;
    getPlanById(id: string): import("rxjs").Observable<unknown>;
    subscribe(dto: SubscribeDto, req: AuthenticatedRequest): import("rxjs").Observable<unknown>;
    cancelSubscription(dto: CancelSubscriptionDto, req: AuthenticatedRequest): import("rxjs").Observable<unknown>;
    getMySubscription(req: AuthenticatedRequest): import("rxjs").Observable<unknown>;
    getPaymentHistory(req: AuthenticatedRequest, limit?: string, offset?: string): import("rxjs").Observable<unknown>;
}
export {};
