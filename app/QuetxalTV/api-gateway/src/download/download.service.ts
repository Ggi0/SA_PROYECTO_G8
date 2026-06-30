import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ClientGrpc } from '@nestjs/microservices'
import { Observable } from 'rxjs'

interface DownloadGrpcService {
  initiateDownload(data: any): Observable<unknown>
  listDownloads(data: any): Observable<unknown>
  deleteDownload(data: any): Observable<unknown>
}

export const PLAN = {
  UNKNOWN:  0,
  BASIC:    1,
  STANDARD: 2,
  PREMIUM:  3,
} as const

@Injectable()
export class DownloadService implements OnModuleInit {
  private grpcClient!: DownloadGrpcService

  constructor(@Inject('DOWNLOAD_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.grpcClient = this.client.getService<DownloadGrpcService>('DownloadService')
  }

 initiateDownload(userId: string, profileId: string, contentId: string, plan: number, token: string, title: string = '', thumbnail: string = '') {
  return this.grpcClient.initiateDownload({
    user_id: userId,
    profile_id: profileId,
    content_id: contentId,
    plan,
    token,
    title,
    thumbnail
  })
}

listDownloads(userId: string, profileId: string, plan: number, token: string) {
  return this.grpcClient.listDownloads({
    user_id: userId,       // ← snake_case
    profile_id: profileId, // ← snake_case
    plan,
    token
  })
}

deleteDownload(userId: string, profileId: string, downloadId: string, plan: number, token: string) {
  return this.grpcClient.deleteDownload({
    user_id: userId,        // ← snake_case
    profile_id: profileId,  // ← snake_case
    download_id: downloadId, // ← snake_case
    plan,
    token
  })
}
}