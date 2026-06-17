import * as http from 'node:http';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

interface CatalogGrpcService {
  // Público
  getCatalog(data: { contentType: string; genreId: number; page: number; pageSize: number }): Observable<unknown>;
  getContentDetail(data: { contentId: string }): Observable<unknown>;
  getSeriesStructure(data: { contentId: string }): Observable<unknown>;
  searchContent(data: { query: string; contentType: string }): Observable<unknown>;
  listGenres(data: Record<string, never>): Observable<unknown>;
  getPerson(data: { personId: string }): Observable<unknown>;
  rateContent(data: { contentId: string; profileId: string; thumb: string; stars: number }): Observable<unknown>;
  getUserRating(data: { contentId: string; profileId: string }): Observable<unknown>;
  // Admin — contenido
  createContent(data: Record<string, unknown>): Observable<unknown>;
  updateContent(data: Record<string, unknown>): Observable<unknown>;
  publishContent(data: { contentId: string }): Observable<unknown>;
  deleteContent(data: { contentId: string; changedBy: string }): Observable<unknown>;
  scheduleContent(data: { contentId: string; premiereDate: string; changedBy: string }): Observable<unknown>;
  // Admin — géneros
  createGenre(data: { name: string; slug: string }): Observable<unknown>;
  updateGenre(data: { genreId: number; name: string; slug: string }): Observable<unknown>;
  deleteGenre(data: { genreId: number; changedBy: string }): Observable<unknown>;
  // Admin — personas
  createPerson(data: Record<string, unknown>): Observable<unknown>;
  updatePerson(data: Record<string, unknown>): Observable<unknown>;
  deletePerson(data: { personId: string; changedBy: string }): Observable<unknown>;
  addPersonToContent(data: Record<string, unknown>): Observable<unknown>;
  removePersonFromContent(data: { contentId: string; personId: string; roleType: string }): Observable<unknown>;
  // Admin — temporadas y episodios
  createSeason(data: Record<string, unknown>): Observable<unknown>;
  deleteSeason(data: { seasonId: string; changedBy: string }): Observable<unknown>;
  createEpisode(data: Record<string, unknown>): Observable<unknown>;
  updateEpisode(data: Record<string, unknown>): Observable<unknown>;
  deleteEpisode(data: { episodeId: string; changedBy: string }): Observable<unknown>;
  // Admin — todo el contenido (publicado y no publicado)
  listAllContent(data: { contentType: string; genreId: number; page: number; pageSize: number }): Observable<unknown>;
}

@Injectable()
export class CatalogService implements OnModuleInit {
  private grpcClient!: CatalogGrpcService;
  private readonly catalogHttpUrl = process.env.CATALOG_HTTP_URL || 'http://localhost:8082';

  constructor(@Inject('CATALOG_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.grpcClient = this.client.getService<CatalogGrpcService>('CatalogService');
  }

  // ---------- Público ----------
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

  // ---------- Admin — contenido ----------
  createContent(body: Record<string, unknown>) {
    return this.grpcClient.createContent(body);
  }
  updateContent(body: Record<string, unknown>) {
    return this.grpcClient.updateContent(body);
  }
  publishContent(contentId: string) {
    return this.grpcClient.publishContent({ contentId });
  }
  deleteContent(contentId: string, changedBy: string) {
    return this.grpcClient.deleteContent({ contentId, changedBy });
  }
  scheduleContent(contentId: string, premiereDate: string, changedBy: string) {
    return this.grpcClient.scheduleContent({ contentId, premiereDate, changedBy });
  }

  // ---------- Admin — géneros ----------
  createGenre(name: string, slug: string) {
    return this.grpcClient.createGenre({ name, slug });
  }
  updateGenre(genreId: number, name: string, slug: string) {
    return this.grpcClient.updateGenre({ genreId, name, slug });
  }
  deleteGenre(genreId: number, changedBy: string) {
    return this.grpcClient.deleteGenre({ genreId, changedBy });
  }

  // ---------- Admin — personas ----------
  createPerson(body: Record<string, unknown>) {
    return this.grpcClient.createPerson(body);
  }
  updatePerson(body: Record<string, unknown>) {
    return this.grpcClient.updatePerson(body);
  }
  deletePerson(personId: string, changedBy: string) {
    return this.grpcClient.deletePerson({ personId, changedBy });
  }
  addPersonToContent(body: Record<string, unknown>) {
    return this.grpcClient.addPersonToContent(body);
  }
  removePersonFromContent(contentId: string, personId: string, roleType: string) {
    return this.grpcClient.removePersonFromContent({ contentId, personId, roleType });
  }

  // ---------- Admin — temporadas y episodios ----------
  createSeason(body: Record<string, unknown>) {
    return this.grpcClient.createSeason(body);
  }
  deleteSeason(seasonId: string, changedBy: string) {
    return this.grpcClient.deleteSeason({ seasonId, changedBy });
  }
  createEpisode(body: Record<string, unknown>) {
    return this.grpcClient.createEpisode(body);
  }
  updateEpisode(body: Record<string, unknown>) {
    return this.grpcClient.updateEpisode(body);
  }
  deleteEpisode(episodeId: string, changedBy: string) {
    return this.grpcClient.deleteEpisode({ episodeId, changedBy });
  }
  listAllContent(contentType = '', genreId = 0, page = 1, pageSize = 24) {
    return this.grpcClient.listAllContent({ contentType, genreId, page, pageSize });
  }

  // ---------- Proxy HTTP → catalog-service:8082 ----------
  proxyGet(path: string, queryString: string, res: Response): void {
    const target = `${this.catalogHttpUrl}${path}${queryString ? '?' + queryString : ''}`;
    http.get(target, (upstream) => {
      res.status(upstream.statusCode ?? 200);
      if (upstream.headers['content-type'])
        res.set('Content-Type', upstream.headers['content-type']);
      if (upstream.headers['content-disposition'])
        res.set('Content-Disposition', upstream.headers['content-disposition'] as string);
      upstream.pipe(res);
    }).on('error', (e) => res.status(502).json({ error: 'catalog proxy: ' + e.message }));
  }

  proxyPost(path: string, req: Request, res: Response): void {
    const parsed = new URL(this.catalogHttpUrl + path);
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: Number(parsed.port) || 8082,
      path: parsed.pathname,
      method: 'POST',
      headers: { ...req.headers, host: parsed.host },
    };
    const upstream = http.request(options, (upRes) => {
      res.status(upRes.statusCode ?? 200);
      if (upRes.headers['content-type'])
        res.set('Content-Type', upRes.headers['content-type']);
      upRes.pipe(res);
    });
    upstream.on('error', (e) => res.status(502).json({ error: 'catalog upload proxy: ' + e.message }));
    req.pipe(upstream);
  }
}
