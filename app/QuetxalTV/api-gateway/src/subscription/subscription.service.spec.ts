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
        userEmail: '',
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

  it('delegates plan queries to grpc client', (done) => {
    const grpcMethods = {
      getPlans: jest.fn().mockReturnValue(of({ plans: [] })),
      getPlanById: jest.fn().mockReturnValue(of({ planId: 'plan-1' })),
      getPlansWithRates: jest.fn().mockReturnValue(of({ currency: 'USD' })),
    };
    const service = buildService(grpcMethods);

    service.getPlans().subscribe((plans) => {
      expect(plans).toEqual({ plans: [] });
      expect(grpcMethods.getPlans).toHaveBeenCalledWith({});

      service.getPlanById('plan-1').subscribe((plan) => {
        expect(plan).toEqual({ planId: 'plan-1' });
        expect(grpcMethods.getPlanById).toHaveBeenCalledWith({ planId: 'plan-1' });

        service.getPlansWithRates(undefined, 'user-1').subscribe((rates) => {
          expect(rates).toEqual({ currency: 'USD' });
          expect(grpcMethods.getPlansWithRates).toHaveBeenCalledWith({ currency: 'USD', userId: 'user-1' });
          done();
        });
      });
    });
  });

  it('queries audit logs with normalized defaults', (done) => {
    const grpcMethods = {
      getAuditLogs: jest.fn().mockReturnValue(of({ entries: [], total: 0 })),
    };
    const service = buildService(grpcMethods);

    service.getAuditLogs({ tableName: 'subscriptions' }).subscribe((resp) => {
      expect(resp).toEqual({ entries: [], total: 0 });
      expect(grpcMethods.getAuditLogs).toHaveBeenCalledWith({
        tableName: 'subscriptions',
        operation: '',
        from: '',
        to: '',
        page: 1,
        pageSize: 20,
      });
      done();
    });
  });

  it('exports audit log with default csv format', (done) => {
    const grpcMethods = {
      exportAuditLog: jest.fn().mockReturnValue(of({ content: Buffer.from('x'), contentType: 'text/csv', filename: 'a.csv' })),
    };
    const service = buildService(grpcMethods);

    service.exportAuditLog({ format: 'pdf', operation: 'UPDATE' }).subscribe((resp) => {
      expect(resp.filename).toBe('a.csv');
      expect(grpcMethods.exportAuditLog).toHaveBeenCalledWith({
        format: 'pdf',
        tableName: '',
        operation: 'UPDATE',
        from: '',
        to: '',
      });
      done();
    });
  });

  it('delegates cancellation and current subscription requests', (done) => {
    const grpcMethods = {
      cancelSubscription: jest.fn().mockReturnValue(of({ success: true })),
      getUserSubscription: jest.fn().mockReturnValue(of({ hasSubscription: true })),
    };
    const service = buildService(grpcMethods);

    service.cancelSubscription('user-1', {}).subscribe((cancelResp) => {
      expect(cancelResp).toEqual({ success: true });
      expect(grpcMethods.cancelSubscription).toHaveBeenCalledWith({
        userId: 'user-1',
        reason: 'Cancelado por el usuario',
      });

      service.getUserSubscription('user-1').subscribe((subscription) => {
        expect(subscription).toEqual({ hasSubscription: true });
        expect(grpcMethods.getUserSubscription).toHaveBeenCalledWith({ userId: 'user-1' });
        done();
      });
    });
  });
});