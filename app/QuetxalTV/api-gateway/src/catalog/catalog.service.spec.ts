import * as http from 'node:http';
import { of } from 'rxjs';
import { CatalogService } from './catalog.service';

jest.mock('node:http', () => ({ get: jest.fn(), request: jest.fn() }));

describe('CatalogService', () => {
  beforeEach(() => jest.clearAllMocks());

  function buildService(grpcMethods: Record<string, jest.Mock> = {}) {
    const client = { getService: jest.fn().mockReturnValue(grpcMethods) } as any;
    const svc = new CatalogService(client);
    svc.onModuleInit();
    return svc;
  }

  // ── Público ──────────────────────────────────────────────────────────────

  it('delegates read operations with defaults', (done) => {
    const g = {
      getCatalog: jest.fn().mockReturnValue(of({ items: [] })),
      getContentDetail: jest.fn().mockReturnValue(of({ contentId: 'c1' })),
      getSeriesStructure: jest.fn().mockReturnValue(of({ seasons: [] })),
      searchContent: jest.fn().mockReturnValue(of({ results: [] })),
      listGenres: jest.fn().mockReturnValue(of({ genres: [] })),
      getPerson: jest.fn().mockReturnValue(of({ personId: 'p1' })),
    };
    const svc = buildService(g);
    svc.getCatalog().subscribe(() => {
      expect(g.getCatalog).toHaveBeenCalledWith({ contentType: '', genreId: 0, page: 1, pageSize: 24 });
      svc.getContentDetail('c1').subscribe(() => {
        expect(g.getContentDetail).toHaveBeenCalledWith({ contentId: 'c1' }, expect.anything());
        svc.getSeriesStructure('c1').subscribe(() => {
          expect(g.getSeriesStructure).toHaveBeenCalledWith({ contentId: 'c1' }, expect.anything());
          svc.searchContent('matrix').subscribe(() => {
            expect(g.searchContent).toHaveBeenCalledWith({ query: 'matrix', contentType: '' });
            svc.listGenres().subscribe(() => {
              expect(g.listGenres).toHaveBeenCalledWith({});
              svc.getPerson('p1').subscribe(() => {
                expect(g.getPerson).toHaveBeenCalledWith({ personId: 'p1' });
                done();
              });
            });
          });
        });
      });
    });
  });

  it('delegates rating operations', (done) => {
    const g = {
      rateContent: jest.fn().mockReturnValue(of({ success: true })),
      getUserRating: jest.fn().mockReturnValue(of({ stars: 5 })),
    };
    const svc = buildService(g);
    svc.rateContent('c1', 'p1', 'up', 5).subscribe(() => {
      expect(g.rateContent).toHaveBeenCalledWith({ contentId: 'c1', profileId: 'p1', thumb: 'up', stars: 5 });
      svc.getUserRating('c1', 'p1').subscribe(() => {
        expect(g.getUserRating).toHaveBeenCalledWith({ contentId: 'c1', profileId: 'p1' });
        done();
      });
    });
  });

  // ── Admin — contenido ─────────────────────────────────────────────────────

  it('delegates admin content operations', (done) => {
    const g = {
      createContent: jest.fn().mockReturnValue(of({ contentId: 'new' })),
      updateContent: jest.fn().mockReturnValue(of({ contentId: 'c1' })),
      publishContent: jest.fn().mockReturnValue(of({ success: true })),
      deleteContent: jest.fn().mockReturnValue(of({ success: true })),
      ScheduleContent: jest.fn().mockReturnValue(of({ success: true })),
    };
    const svc = buildService(g);
    svc.createContent({ title: 'Test', contentType: 'MOVIE' }).subscribe(() => {
      expect(g.createContent).toHaveBeenCalledWith({ title: 'Test', contentType: 'MOVIE' });
      svc.updateContent({ contentId: 'c1', title: 'Updated' }).subscribe(() => {
        expect(g.updateContent).toHaveBeenCalledWith({ contentId: 'c1', title: 'Updated' });
        svc.publishContent('c1').subscribe(() => {
          expect(g.publishContent).toHaveBeenCalledWith({ contentId: 'c1' });
          svc.deleteContent('c1', 'admin').subscribe(() => {
            expect(g.deleteContent).toHaveBeenCalledWith({ contentId: 'c1', changedBy: 'admin' });
            svc.scheduleContent('c1', '2026-12-25T20:00:00Z', 'admin').subscribe(() => {
              expect(g.ScheduleContent).toHaveBeenCalledWith({
                contentId: 'c1', premiereDate: '2026-12-25T20:00:00Z', changedBy: 'admin',
              });
              done();
            });
          });
        });
      });
    });
  });

  // ── Admin — géneros ───────────────────────────────────────────────────────

  it('delegates admin genre operations', (done) => {
    const g = {
      createGenre: jest.fn().mockReturnValue(of({ genreId: 1 })),
      updateGenre: jest.fn().mockReturnValue(of({ genreId: 1 })),
      deleteGenre: jest.fn().mockReturnValue(of({ success: true })),
    };
    const svc = buildService(g);
    svc.createGenre('Terror', 'terror').subscribe(() => {
      expect(g.createGenre).toHaveBeenCalledWith({ name: 'Terror', slug: 'terror' });
      svc.updateGenre(1, 'Terror', 'terror').subscribe(() => {
        expect(g.updateGenre).toHaveBeenCalledWith({ genreId: 1, name: 'Terror', slug: 'terror' });
        svc.deleteGenre(1, 'admin').subscribe(() => {
          expect(g.deleteGenre).toHaveBeenCalledWith({ genreId: 1, changedBy: 'admin' });
          done();
        });
      });
    });
  });

  // ── Admin — personas y elenco ─────────────────────────────────────────────

  it('delegates admin person and cast operations', (done) => {
    const g = {
      createPerson: jest.fn().mockReturnValue(of({ personId: 'p1' })),
      updatePerson: jest.fn().mockReturnValue(of({ personId: 'p1' })),
      deletePerson: jest.fn().mockReturnValue(of({ success: true })),
      addPersonToContent: jest.fn().mockReturnValue(of({ success: true })),
      removePersonFromContent: jest.fn().mockReturnValue(of({ success: true })),
    };
    const svc = buildService(g);
    svc.createPerson({ fullName: 'Actor' }).subscribe(() => {
      expect(g.createPerson).toHaveBeenCalledWith({ fullName: 'Actor' });
      svc.updatePerson({ personId: 'p1', fullName: 'Updated' }).subscribe(() => {
        expect(g.updatePerson).toHaveBeenCalledWith({ personId: 'p1', fullName: 'Updated' });
        svc.deletePerson('p1', 'admin').subscribe(() => {
          expect(g.deletePerson).toHaveBeenCalledWith({ personId: 'p1', changedBy: 'admin' });
          svc.addPersonToContent({ contentId: 'c1', personId: 'p1', roleType: 'ACTOR' }).subscribe(() => {
            expect(g.addPersonToContent).toHaveBeenCalledWith({ contentId: 'c1', personId: 'p1', roleType: 'ACTOR' });
            svc.removePersonFromContent('c1', 'p1', 'ACTOR').subscribe(() => {
              expect(g.removePersonFromContent).toHaveBeenCalledWith({ contentId: 'c1', personId: 'p1', roleType: 'ACTOR' });
              done();
            });
          });
        });
      });
    });
  });

  // ── Admin — temporadas y episodios ────────────────────────────────────────

  it('delegates admin season and episode operations', (done) => {
    const g = {
      createSeason: jest.fn().mockReturnValue(of({ seasonId: 's1' })),
      deleteSeason: jest.fn().mockReturnValue(of({ success: true })),
      createEpisode: jest.fn().mockReturnValue(of({ episodeId: 'e1' })),
      updateEpisode: jest.fn().mockReturnValue(of({ episodeId: 'e1' })),
      deleteEpisode: jest.fn().mockReturnValue(of({ success: true })),
    };
    const svc = buildService(g);
    svc.createSeason({ contentId: 'c1', seasonNum: 1 }).subscribe(() => {
      expect(g.createSeason).toHaveBeenCalledWith({ contentId: 'c1', seasonNum: 1 });
      svc.deleteSeason('s1', 'admin').subscribe(() => {
        expect(g.deleteSeason).toHaveBeenCalledWith({ seasonId: 's1', changedBy: 'admin' });
        svc.createEpisode({ seasonId: 's1', title: 'Piloto' }).subscribe(() => {
          expect(g.createEpisode).toHaveBeenCalledWith({ seasonId: 's1', title: 'Piloto' });
          svc.updateEpisode({ episodeId: 'e1', title: 'Updated' }).subscribe(() => {
            expect(g.updateEpisode).toHaveBeenCalledWith({ episodeId: 'e1', title: 'Updated' });
            svc.deleteEpisode('e1', 'admin').subscribe(() => {
              expect(g.deleteEpisode).toHaveBeenCalledWith({ episodeId: 'e1', changedBy: 'admin' });
              done();
            });
          });
        });
      });
    });
  });

  // ── proxyGet ──────────────────────────────────────────────────────────────

  describe('proxyGet', () => {
    it('pipes upstream to res and forwards content-type', () => {
      const upstream = { statusCode: 200, headers: { 'content-type': 'application/json' }, pipe: jest.fn() };
      (http.get as jest.Mock).mockImplementation((_url: string, cb: (u: typeof upstream) => void) => {
        cb(upstream);
        return { on: jest.fn().mockReturnThis() };
      });
      const res = { status: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      buildService().proxyGet('/audit/logs', 'page=1', res);

      expect(http.get).toHaveBeenCalledWith('http://localhost:8082/audit/logs?page=1', expect.any(Function));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(upstream.pipe).toHaveBeenCalledWith(res);
    });

    it('forwards content-disposition header for file downloads', () => {
      const upstream = {
        statusCode: 200,
        headers: { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename=audit.csv' },
        pipe: jest.fn(),
      };
      (http.get as jest.Mock).mockImplementation((_url: string, cb: (u: typeof upstream) => void) => {
        cb(upstream);
        return { on: jest.fn().mockReturnThis() };
      });
      const res = { status: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      buildService().proxyGet('/audit/export', 'format=csv', res);

      expect(res.set).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=audit.csv');
    });

    it('omits query separator when queryString is empty', () => {
      const upstream = { statusCode: 200, headers: {}, pipe: jest.fn() };
      (http.get as jest.Mock).mockImplementation((_url: string, cb: (u: typeof upstream) => void) => {
        cb(upstream);
        return { on: jest.fn().mockReturnThis() };
      });
      const res = { status: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      buildService().proxyGet('/audit/logs', '', res);

      expect(http.get).toHaveBeenCalledWith('http://localhost:8082/audit/logs', expect.any(Function));
    });

    it('responds 502 on connection error', () => {
      (http.get as jest.Mock).mockImplementation(() => ({
        on: jest.fn().mockImplementation((event: string, cb: (e: Error) => void) => {
          if (event === 'error') cb(new Error('ECONNREFUSED'));
          return { on: jest.fn() };
        }),
      }));
      const res = { status: jest.fn().mockReturnThis(), set: jest.fn(), json: jest.fn() } as any;

      buildService().proxyGet('/audit/logs', '', res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({ error: 'catalog proxy: ECONNREFUSED' });
    });
  });

  // ── proxyPost ─────────────────────────────────────────────────────────────

  describe('proxyPost', () => {
    it('pipes req to upstream and response back to res', () => {
      const upRes = { statusCode: 201, headers: { 'content-type': 'application/json' }, pipe: jest.fn() };
      const upstream = { on: jest.fn().mockReturnThis() };
      (http.request as jest.Mock).mockImplementation((_opts: unknown, cb: (r: typeof upRes) => void) => {
        cb(upRes);
        return upstream;
      });
      const req = { headers: { 'content-type': 'multipart/form-data' }, pipe: jest.fn() } as any;
      const res = { status: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      buildService().proxyPost('/admin/upload', req, res);

      expect(http.request).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(upRes.pipe).toHaveBeenCalledWith(res);
      expect(req.pipe).toHaveBeenCalledWith(upstream);
    });

    it('responds 502 on upstream error', () => {
      const upstream = {
        on: jest.fn().mockImplementation((event: string, cb: (e: Error) => void) => {
          if (event === 'error') cb(new Error('upload failed'));
          return upstream;
        }),
      };
      (http.request as jest.Mock).mockReturnValue(upstream);
      const req = { headers: {}, pipe: jest.fn() } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

      buildService().proxyPost('/admin/upload', req, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({ error: 'catalog upload proxy: upload failed' });
    });
  });
});