import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface DownloadGrpcService {
  initiateDownload(data: {
    userId: string;
    profileId: string;
    contentId: string;
    plan: number;
  }): Observable<unknown>;

  listDownloads(data: {
    userId: string;
    profileId: string;
    plan: number;
  }): Observable<unknown>;

  deleteDownload(data: {
    userId: string;
    profileId: string;
    downloadId: string;
    plan: number;
  }): Observable<unknown>;
}

// Valores del enum SubscriptionPlan (espejo del .proto)
export const PLAN = {
  UNKNOWN:  0,
  BASIC:    1,
  STANDARD: 2,
  PREMIUM:  3,
} as const;

@Injectable()
export class DownloadService implements OnModuleInit {
  private grpcClient!: DownloadGrpcService;

  constructor(@Inject('DOWNLOAD_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.grpcClient = this.client.getService<DownloadGrpcService>('DownloadService');
  }

  initiateDownload(userId: string, profileId: string, contentId: string, plan: number) {
    return this.grpcClient.initiateDownload({ userId, profileId, contentId, plan });
  }

  listDownloads(userId: string, profileId: string, plan: number) {
    return this.grpcClient.listDownloads({ userId, profileId, plan });
  }

  deleteDownload(userId: string, profileId: string, downloadId: string, plan: number) {
    return this.grpcClient.deleteDownload({ userId, profileId, downloadId, plan });
  }
}