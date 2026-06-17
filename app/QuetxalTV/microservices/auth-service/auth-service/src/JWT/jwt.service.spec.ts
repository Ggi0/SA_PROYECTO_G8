import * as jwt from 'jsonwebtoken';
import { JwtService } from './jwt.service';

describe('JwtService', () => {
  const config = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-test-secret',
        JWT_REFRESH_SECRET: 'refresh-test-secret',
      };
      return values[key];
    }),
    get: jest.fn((key: string, fallback: string) => fallback),
  } as any;

  const payload = {
    sub: 'user-1',
    email: 'user@test.com',
    role: 'client' as const,
    tokenVersion: 1,
    activeProfileId: null,
  };

  it('signs and verifies access tokens', () => {
    const service = new JwtService(config);
    const token = service.signAccessToken(payload);

    expect(service.verifyAccessToken(token)).toMatchObject(payload);
    expect(jwt.verify(token, 'access-test-secret')).toMatchObject(payload);
  });

  it('issues refresh tokens with deterministic hashes', () => {
    const service = new JwtService(config);
    const pair = service.issueTokenPair(payload);

    expect(pair.accessToken).toEqual(expect.any(String));
    expect(pair.refreshToken).toHaveLength(128);
    expect(pair.refreshTokenHash).toBe(service.hashToken(pair.refreshToken));
    expect(pair.expiresIn).toBe(900);
  });

  it('generates expiration dates and verification tokens', () => {
    const service = new JwtService(config);
    const before = Date.now();
    const refreshExpiration = service.refreshTokenExpiresAt().getTime();
    const verificationExpiration = service.verificationTokenExpiresAt().getTime();
    const verification = service.generateVerificationToken();

    expect(refreshExpiration).toBeGreaterThanOrEqual(before + 2592000 * 1000 - 1000);
    expect(verificationExpiration).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000 - 1000);
    expect(verification.raw).toHaveLength(64);
    expect(verification.hash).toBe(service.hashToken(verification.raw));
  });
});
