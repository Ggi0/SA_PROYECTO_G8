// test/jwt.service.spec.ts

import * as jwt from 'jsonwebtoken';
import { JwtService } from '../../src/JWT/jwt.service';

describe('JwtService (ROBUST)', () => {
  let service: JwtService;

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

  beforeEach(() => {
    service = new JwtService(config);
  });

  // ─────────────────────────────────────────────
  // SIGN + VERIFY
  // ─────────────────────────────────────────────
  it('should sign and verify access token correctly', () => {
    const token = service.signAccessToken(payload);

    const decoded = service.verifyAccessToken(token);

    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('should fail verification if token is modified', () => {
    const token = service.signAccessToken(payload);

    const brokenToken = token + 'corrupted';

    expect(() => service.verifyAccessToken(brokenToken)).toThrow();
  });

  // ─────────────────────────────────────────────
  // ACCESS TOKEN STRUCTURE
  // ─────────────────────────────────────────────
  it('should generate a valid JWT structure', () => {
    const token = service.signAccessToken(payload);

    const decoded = jwt.decode(token) as any;

    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // REFRESH TOKEN GENERATION
  // ─────────────────────────────────────────────
  it('should generate refresh token with correct length and hash', () => {
    const { raw, hash } = service.generateRefreshToken();

    expect(raw.length).toBe(128); // 64 bytes hex
    expect(hash).toBe(service.hashToken(raw));
  });

  it('should generate different refresh tokens each time', () => {
    const t1 = service.generateRefreshToken();
    const t2 = service.generateRefreshToken();

    expect(t1.raw).not.toBe(t2.raw);
    expect(t1.hash).not.toBe(t2.hash);
  });

  // ─────────────────────────────────────────────
  // TOKEN PAIR
  // ─────────────────────────────────────────────
  it('should issue token pair correctly', () => {
    const pair = service.issueTokenPair(payload);

    expect(pair.accessToken).toEqual(expect.any(String));
    expect(pair.refreshToken).toHaveLength(128);
    expect(pair.refreshTokenHash).toBe(
      service.hashToken(pair.refreshToken),
    );
    expect(pair.expiresIn).toBe(900);
  });

  // ─────────────────────────────────────────────
  // HASH TOKEN
  // ─────────────────────────────────────────────
  it('should hash token deterministically', () => {
    const input = 'test-token';

    const hash1 = service.hashToken(input);
    const hash2 = service.hashToken(input);

    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different inputs', () => {
    const hash1 = service.hashToken('a');
    const hash2 = service.hashToken('b');

    expect(hash1).not.toBe(hash2);
  });

  // ─────────────────────────────────────────────
  // EXPIRATION METHODS
  // ─────────────────────────────────────────────
  it('should calculate refresh token expiration correctly', () => {
    const now = Date.now();
    const exp = service.refreshTokenExpiresAt().getTime();

    expect(exp).toBeGreaterThan(now);
  });

  it('should calculate verification token expiration correctly', () => {
    const now = Date.now();
    const exp = service.verificationTokenExpiresAt().getTime();

    expect(exp).toBeGreaterThan(now);
  });

  // ─────────────────────────────────────────────
  // VERIFICATION TOKEN
  // ─────────────────────────────────────────────
  it('should generate verification token correctly', () => {
    const vt = service.generateVerificationToken();

    expect(vt.raw.length).toBe(64); // 32 bytes hex
    expect(vt.hash).toBe(service.hashToken(vt.raw));
  });

  it('should generate unique verification tokens', () => {
    const t1 = service.generateVerificationToken();
    const t2 = service.generateVerificationToken();

    expect(t1.raw).not.toBe(t2.raw);
  });

  // ─────────────────────────────────────────────
  // REAL JWT VERIFY (extra seguridad)
  // ─────────────────────────────────────────────
  it('should verify token with jsonwebtoken lib', () => {
    const token = service.signAccessToken(payload);

    const decoded = jwt.verify(token, 'access-test-secret') as any;

    expect(decoded.sub).toBe(payload.sub);
  });
});