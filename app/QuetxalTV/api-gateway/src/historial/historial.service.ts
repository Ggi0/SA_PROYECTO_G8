// src/historial/historial.service.ts
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

// ─── Interfaces auditoría ─────────────────────────────────────────────────────

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

// ─── Interfaces player ────────────────────────────────────────────────────────

export interface ProgressItem {
  progress_id: string;
  profile_id: string;
  content_id: string;
  content_type: string;
  minute_reached: number;
  total_duration_min: number;
  completion_pct: number;
  is_completed: boolean;
  last_watched_at: string;
  last_episode_id: string;
  last_season_num: number;
  last_episode_num: number;
  last_ep_minute: number;
}

export interface ProgressResponse {
  success: boolean;
  message: string;
  progress: ProgressItem;
}

export interface ContinueWatchingResponse {
  items: ProgressItem[];
}

// ─── Interfaz gRPC completa ───────────────────────────────────────────────────

export interface HistorialGrpcService {
  // Auditoría
  getHistoryAuditLogs(data: GetHistoryAuditLogsRequest): Observable<HistoryAuditLogsResponse>;
  healthLive(data: Record<string, never>): Observable<HealthCheckResponse>;
  healthReady(data: Record<string, never>): Observable<HealthCheckResponse>;

  // Player
  updateMovieProgress(data: {
    profile_id: string;
    content_id: string;
    minute_reached: number;
    total_duration_min: number;
  }): Observable<ProgressResponse>;

  updateEpisodeProgress(data: {
    profile_id: string;
    content_id: string;
    season_id: string;
    episode_id: string;
    season_num: number;
    episode_num: number;
    minute_reached: number;
    total_duration_min: number;
  }): Observable<ProgressResponse>;

  getContinueWatching(data: {
    profile_id: string;
    limit: number;
  }): Observable<ContinueWatchingResponse>;

  getContentProgress(data: {
    profile_id: string;
    content_id: string;
  }): Observable<ProgressResponse>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

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

  // ── Auditoría ──────────────────────────────────────────────────────────────

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

  // ── Player ─────────────────────────────────────────────────────────────────

  updateMovieProgress(
    profileId: string,
    contentId: string,
    minuteReached: number,
    totalDurationMin: number,
  ): Observable<ProgressResponse> {
    return this.grpcClient.updateMovieProgress({
      profile_id: profileId,
      content_id: contentId,
      minute_reached: minuteReached,
      total_duration_min: totalDurationMin,
    });
  }

  updateEpisodeProgress(
    profileId: string,
    contentId: string,
    seasonId: string,
    episodeId: string,
    seasonNum: number,
    episodeNum: number,
    minuteReached: number,
    totalDurationMin: number,
  ): Observable<ProgressResponse> {
    return this.grpcClient.updateEpisodeProgress({
      profile_id: profileId,
      content_id: contentId,
      season_id: seasonId,
      episode_id: episodeId,
      season_num: seasonNum,
      episode_num: episodeNum,
      minute_reached: minuteReached,
      total_duration_min: totalDurationMin,
    });
  }

  getContinueWatching(
    profileId: string,
    limit = 10,
  ): Observable<ContinueWatchingResponse> {
    return this.grpcClient.getContinueWatching({
      profile_id: profileId,
      limit,
    });
  }

  getContentProgress(
    profileId: string,
    contentId: string,
  ): Observable<ProgressResponse> {
    return this.grpcClient.getContentProgress({
      profile_id: profileId,
      content_id: contentId,
    });
  }
}
