// src/audit/audit.service.ts
import * as http from 'node:http';
import { Injectable } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class AuditService {
  private readonly subscriptionAuditUrl =
    process.env.SUBSCRIPTION_HTTP_URL || 'http://subscription-service:8083';
  private readonly notificationAuditUrl =
    process.env.NOTIFICATION_HTTP_URL || 'http://notification-service:8084';
  private readonly fxAuditUrl =
    process.env.FX_HTTP_URL || 'http://fx-service:8085';

  private proxyGet(baseUrl: string, queryString: string, res: Response): void {
    const target = `${baseUrl}/audit/logs${queryString ? '?' + queryString : ''}`;
    http
      .get(target, (upstream) => {
        res.status(upstream.statusCode ?? 200);
        if (upstream.headers['content-type'])
          res.set('Content-Type', upstream.headers['content-type']);
        upstream.pipe(res);
      })
      .on('error', (e) =>
        res.status(502).json({ error: 'audit proxy error: ' + e.message }),
      );
  }

  getSubscriptionAuditLogs(queryString: string, res: Response): void {
    this.proxyGet(this.subscriptionAuditUrl, queryString, res);
  }

  getNotificationAuditLogs(queryString: string, res: Response): void {
    this.proxyGet(this.notificationAuditUrl, queryString, res);
  }

  getFxAuditLogs(queryString: string, res: Response): void {
    this.proxyGet(this.fxAuditUrl, queryString, res);
  }
}
