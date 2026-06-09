import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface CatalogGrpcService {
  getCatalog(data: { contentType: string; genreId: number; page: number; pageSize: number }): Observable<unknown>;
  getContentDetail(data: { contentId: string }): Observable<unknown>;
  getSeriesStructure(data: { contentId: string }): Observable<unknown>;
  searchContent(data: { query: string; contentType: string }): Observable<unknown>;
  listGenres(data: Record<string, never>): Observable<unknown>;
  getPerson(data: { personId: string }): Observable<unknown>;
  rateContent(data: { contentId: string; profileId: string; thumb: string; stars: number }): Observable<unknown>;
  getUserRating(data: { contentId: string; profileId: string }): Observable<unknown>;
}

@Injectable()
export class CatalogService implements OnModuleInit {
  private grpcClient!: CatalogGrpcService;

  constructor(@Inject('CATALOG_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.grpcClient = this.client.getService<CatalogGrpcService>('CatalogService');
  }

  getCatalog(contentType = '', genreId = 0, page = 1, pageSize = 24) {
    return this.grpcClient.getCatalog({ contentType, genreId, page, pageSize });
  }

  getContentDetail(contentId: string) {
    return this.grpcClient.getContentDetail({ contentId });
  }

  getSeriesStructure(contentId: string) {
    return this.grpcClient.getSeriesStructure({ contentId });
  }

  searchContent(query: string, contentType = '') {
    return this.grpcClient.searchContent({ query, contentType });
  }

  listGenres() {
    return this.grpcClient.listGenres({} as Record<string, never>);
  }

  getPerson(personId: string) {
    return this.grpcClient.getPerson({ personId });
  }

  rateContent(contentId: string, profileId: string, thumb: string, stars: number) {
    return this.grpcClient.rateContent({ contentId, profileId, thumb, stars });
  }

  getUserRating(contentId: string, profileId: string) {
    return this.grpcClient.getUserRating({ contentId, profileId });
  }
}
