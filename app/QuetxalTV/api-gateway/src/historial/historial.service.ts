import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

export interface GetHistoryAuditLogsRequest {
  table_name: string;
  action: string;
  limit: number;
  offset: number;
}

export interface HistoryAuditLogItem {
  audit_id: string;
  responsible_user_id: string;
  responsible_profile_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_state: string;
  new_state: string;
  created_at: string;
}

export interface HistoryAuditLogsResponse {
  items: HistoryAuditLogItem[];
}

export interface HealthCheckResponse {
  success: boolean;
  status: string;
  service: string;
  message: string;
}

export interface HistorialGrpcService {
  getHistoryAuditLogs(
    data: GetHistoryAuditLogsRequest,
  ): Observable<HistoryAuditLogsResponse>;
    healthLive(data: Record<string, never>): Observable<HealthCheckResponse>;

  healthReady(data: Record<string, never>): Observable<HealthCheckResponse>;
}

@Injectable()
export class HistorialService implements OnModuleInit {
  private grpcClient!: HistorialGrpcService;

  constructor(
    @Inject('HISTORIAL_PACKAGE')
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.grpcClient =
      this.client.getService<HistorialGrpcService>('HistorialService');
  }

  getHistoryAuditLogs(
    tableName = '',
    action = '',
    limit = 100,
    offset = 0,
  ): Observable<HistoryAuditLogsResponse> {
    return this.grpcClient.getHistoryAuditLogs({
      table_name: tableName,
      action,
      limit,
      offset,
    });
  }
    healthLive(): Observable<HealthCheckResponse> {
    return this.grpcClient.healthLive({});
  }

  healthReady(): Observable<HealthCheckResponse> {
    return this.grpcClient.healthReady({});
  }
}