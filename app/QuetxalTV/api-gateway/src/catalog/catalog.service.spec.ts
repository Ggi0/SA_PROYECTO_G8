import { of } from 'rxjs';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  function buildService(grpcMethods: Record<string, jest.Mock>) {
    const client = { getService: jest.fn().mockReturnValue(grpcMethods) } as any;
    const service = new CatalogService(client);
    service.onModuleInit();
    return service;
  }

  it('delegates read operations with defaults', (done) => {
    const grpcMethods = {
      getCatalog: jest.fn().mockReturnValue(of({ items: [] })),
      getContentDetail: jest.fn().mockReturnValue(of({ contentId: 'c1' })),
      getSeriesStructure: jest.fn().mockReturnValue(of({ seasons: [] })),
      searchContent: jest.fn().mockReturnValue(of({ results: [] })),
      listGenres: jest.fn().mockReturnValue(of({ genres: [] })),
      getPerson: jest.fn().mockReturnValue(of({ personId: 'p1' })),
    };
    const service = buildService(grpcMethods);

    service.getCatalog().subscribe(() => {
      expect(grpcMethods.getCatalog).toHaveBeenCalledWith({ contentType: '', genreId: 0, page: 1, pageSize: 24 });
      service.getContentDetail('c1').subscribe(() => {
        expect(grpcMethods.getContentDetail).toHaveBeenCalledWith({ contentId: 'c1' });
        service.getSeriesStructure('c1').subscribe(() => {
          expect(grpcMethods.getSeriesStructure).toHaveBeenCalledWith({ contentId: 'c1' });
          service.searchContent('matrix').subscribe(() => {
            expect(grpcMethods.searchContent).toHaveBeenCalledWith({ query: 'matrix', contentType: '' });
            service.listGenres().subscribe(() => {
              expect(grpcMethods.listGenres).toHaveBeenCalledWith({});
              service.getPerson('p1').subscribe(() => {
                expect(grpcMethods.getPerson).toHaveBeenCalledWith({ personId: 'p1' });
                done();
              });
            });
          });
        });
      });
    });
  });

  it('delegates rating operations', (done) => {
    const grpcMethods = {
      rateContent: jest.fn().mockReturnValue(of({ success: true })),
      getUserRating: jest.fn().mockReturnValue(of({ stars: 5 })),
    };
    const service = buildService(grpcMethods);

    service.rateContent('c1', 'p1', 'up', 5).subscribe(() => {
      expect(grpcMethods.rateContent).toHaveBeenCalledWith({ contentId: 'c1', profileId: 'p1', thumb: 'up', stars: 5 });
      service.getUserRating('c1', 'p1').subscribe(() => {
        expect(grpcMethods.getUserRating).toHaveBeenCalledWith({ contentId: 'c1', profileId: 'p1' });
        done();
      });
    });
  });
});
