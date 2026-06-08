import { of } from 'rxjs';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  function buildService(grpcMethods: Record<string, jest.Mock>) {
    const client = {
      getService: jest.fn().mockReturnValue(grpcMethods),
    } as any;
    const service = new SubscriptionService(client);
    service.onModuleInit();
    return service;
  }

  it('sends subscription payload with defaults', (done) => {
    const grpcMethods = {
      subscribe: jest.fn().mockReturnValue(of({ success: true })),
    };
    const service = buildService(grpcMethods);

    service.subscribe('user-1', { planId: 'plan-1' }).subscribe((resp) => {
      expect(resp).toEqual({ success: true });
      expect(grpcMethods.subscribe).toHaveBeenCalledWith({
        userId: 'user-1',
        planId: 'plan-1',
        currency: 'USD',
        paymentMethod: 'unknown',
      });
      done();
    });
  });

  it('requests payment history with pagination', (done) => {
    const grpcMethods = {
      getPaymentHistory: jest.fn().mockReturnValue(of({ total: 0, payments: [] })),
    };
    const service = buildService(grpcMethods);

    service.getPaymentHistory('user-1', 25, 10).subscribe((resp) => {
      expect(resp).toEqual({ total: 0, payments: [] });
      expect(grpcMethods.getPaymentHistory).toHaveBeenCalledWith({ userId: 'user-1', limit: 25, offset: 10 });
      done();
    });
  });
});
