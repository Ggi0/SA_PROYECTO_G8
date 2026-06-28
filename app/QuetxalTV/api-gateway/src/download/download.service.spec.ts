import { of } from 'rxjs';
import { DownloadService, PLAN } from './download.service';

describe('DownloadService', () => {
  function buildService(grpcMethods: Record<string, jest.Mock> = {}) {
    const client = { getService: jest.fn().mockReturnValue(grpcMethods) } as any;
    const svc = new DownloadService(client);
    svc.onModuleInit();
    return svc;
  }

  it('llama initiateDownload con los parámetros correctos', (done) => {
    const g = {
      initiateDownload: jest.fn().mockReturnValue(
        of({ allowed: true, downloadId: 'dl_001', message: 'OK' })
      ),
    };
    const svc = buildService(g);

    svc.initiateDownload('user_001', 'profile_001', 'content_001', PLAN.PREMIUM)
      .subscribe(() => {
        expect(g.initiateDownload).toHaveBeenCalledWith({
          userId: 'user_001',
          profileId: 'profile_001',
          contentId: 'content_001',
          plan: PLAN.PREMIUM,
        });
        done();
      });
  });

  it('bloquea si el plan es BASIC', (done) => {
    const g = {
      initiateDownload: jest.fn().mockReturnValue(
        of({ allowed: false, message: 'Plan Básico no incluye descarga.' })
      ),
    };
    const svc = buildService(g);

    svc.initiateDownload('user_001', 'profile_001', 'content_001', PLAN.BASIC)
      .subscribe((res: any) => {
        expect(res.allowed).toBe(false);
        done();
      });
  });

  it('bloquea si el plan es STANDARD', (done) => {
    const g = {
      initiateDownload: jest.fn().mockReturnValue(
        of({ allowed: false, message: 'Plan Estándar no incluye descarga.' })
      ),
    };
    const svc = buildService(g);

    svc.initiateDownload('user_001', 'profile_001', 'content_001', PLAN.STANDARD)
      .subscribe((res: any) => {
        expect(res.allowed).toBe(false);
        done();
      });
  });

  it('llama listDownloads con los parámetros correctos', (done) => {
    const g = {
      listDownloads: jest.fn().mockReturnValue(
        of({ allowed: true, downloads: [], message: '0 descargas.' })
      ),
    };
    const svc = buildService(g);

    svc.listDownloads('user_001', 'profile_001', PLAN.PREMIUM)
      .subscribe(() => {
        expect(g.listDownloads).toHaveBeenCalledWith({
          userId: 'user_001',
          profileId: 'profile_001',
          plan: PLAN.PREMIUM,
        });
        done();
      });
  });

  it('llama deleteDownload con los parámetros correctos', (done) => {
    const g = {
      deleteDownload: jest.fn().mockReturnValue(
        of({ success: true, message: 'Eliminado.' })
      ),
    };
    const svc = buildService(g);

    svc.deleteDownload('user_001', 'profile_001', 'dl_001', PLAN.PREMIUM)
      .subscribe(() => {
        expect(g.deleteDownload).toHaveBeenCalledWith({
          userId: 'user_001',
          profileId: 'profile_001',
          downloadId: 'dl_001',
          plan: PLAN.PREMIUM,
        });
        done();
      });
  });
});