import { OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { CancelSubscriptionDto, SubscribeDto } from './dto/subscribe.dto';
export declare class SubscriptionService implements OnModuleInit {
    private readonly client;
    private grpcClient;
    constructor(client: ClientGrpc);
    onModuleInit(): void;
    getPlans(): Observable<unknown>;
    getPlanById(planId: string): Observable<unknown>;
    getPlansWithRates(currency: string | undefined, userId: string): Observable<unknown>;
    subscribe(userId: string, dto: SubscribeDto): Observable<unknown>;
    cancelSubscription(userId: string, dto: CancelSubscriptionDto): Observable<unknown>;
    getUserSubscription(userId: string): Observable<unknown>;
    getPaymentHistory(userId: string, limit?: number, offset?: number): Observable<unknown>;
}
