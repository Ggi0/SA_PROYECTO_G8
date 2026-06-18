// test/auth.service.spec.ts

import { AuthService } from '../../src/auth/auth.service';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

describe('AuthService (ROBUST)', () => {
  let service: AuthService;

  const mockAuthRepository = {
    existsByEmail: jest.fn(),
    registerUser: jest.fn(),
    activateUser: jest.fn(),
    verifyPassword: jest.fn(),
    findByEmail: jest.fn(),
    getUserProfilesSummary: jest.fn(),
    saveRefreshToken: jest.fn(),
    findActiveRefreshToken: jest.fn(),
    findById: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllTokens: jest.fn(),
    incrementTokenVersion: jest.fn(),
    invalidatePreviousVerificationTokens: jest.fn(),
    saveVerificationToken: jest.fn(),
    findValidVerificationToken: jest.fn(),
    markVerificationTokenUsed: jest.fn(),
    dataSourceQuery: jest.fn(),
  };

  const mockJwtService = {
    issueTokenPair: jest.fn(),
    refreshTokenExpiresAt: jest.fn(),
    hashToken: jest.fn(),
    generateVerificationToken: jest.fn(),
    verificationTokenExpiresAt: jest.fn(),
    verifyAccessToken: jest.fn(),
  };

  const mockNotificationClient = {
    sendWelcomeEmail: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      mockAuthRepository as any,
      mockJwtService as any,
      mockNotificationClient as any,
    );
  });

  // ───────────────── REGISTER ─────────────────
  it('register OK', async () => {
    mockAuthRepository.existsByEmail.mockResolvedValue(false);
    mockAuthRepository.registerUser.mockResolvedValue({
      userId: '1',
      profileId: 'p1',
    });

    const res = await service.register({
      email: 'a@test.com',
      password: '123',
      displayName: 'A',
    });

    expect(res.userId).toBe('1');
  });

  it('register conflict', async () => {
    mockAuthRepository.existsByEmail.mockResolvedValue(true);

    await expect(
      service.register({
        email: 'x@test.com',
        password: '123',
        displayName: 'X',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('register email fail (no rompe flujo)', async () => {
    mockAuthRepository.existsByEmail.mockResolvedValue(false);
    mockAuthRepository.registerUser.mockResolvedValue({
      userId: '1',
      profileId: 'p1',
    });
    mockNotificationClient.sendWelcomeEmail.mockRejectedValue(new Error());

    const res = await service.register({
      email: 'a@test.com',
      password: '123',
      displayName: 'A',
    });

    expect(res.userId).toBe('1');
  });

  // ───────────────── LOGIN ─────────────────
  it('login OK', async () => {
    mockAuthRepository.verifyPassword.mockResolvedValue(true);
    mockAuthRepository.findByEmail.mockResolvedValue({
      userId: '1',
      email: 'a@test.com',
      role: 'user',
      tokenVersion: 1,
      isActive: true,
    });
    mockAuthRepository.getUserProfilesSummary.mockResolvedValue({ profiles: [] });

    mockJwtService.issueTokenPair.mockReturnValue({
      accessToken: 'a',
      refreshToken: 'r',
      refreshTokenHash: 'h',
      expiresIn: 3600,
    });

    const res = await service.login({
      email: 'a@test.com',
      password: '123',
    } as any);

    expect(res.accessToken).toBe('a');
  });

  it('login password incorrecto', async () => {
    mockAuthRepository.verifyPassword.mockResolvedValue(false);

    await expect(
      service.login({ email: 'x', password: 'y' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login user null', async () => {
    mockAuthRepository.verifyPassword.mockResolvedValue(true);
    mockAuthRepository.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'x', password: 'y' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login user inactive', async () => {
    mockAuthRepository.verifyPassword.mockResolvedValue(true);
    mockAuthRepository.findByEmail.mockResolvedValue({
      isActive: false,
    });

    await expect(
      service.login({ email: 'x', password: 'y' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ───────────────── REFRESH ─────────────────
  it('refresh OK', async () => {
    mockJwtService.hashToken.mockReturnValue('hash');

    mockAuthRepository.findActiveRefreshToken.mockResolvedValue({
      userId: '1',
      expiresAt: new Date(Date.now() + 10000),
    });

    mockAuthRepository.findById.mockResolvedValue({
      userId: '1',
      email: 'a@test.com',
      role: 'user',
      tokenVersion: 1,
      isActive: true,
    });

    mockJwtService.issueTokenPair.mockReturnValue({
      accessToken: 'newA',
      refreshToken: 'newR',
      refreshTokenHash: 'newH',
      expiresIn: 3600,
    });

    const res = await service.refreshToken('raw');

    expect(res.accessToken).toBe('newA');
  });

  it('refresh expirado', async () => {
    mockJwtService.hashToken.mockReturnValue('hash');
    mockAuthRepository.findActiveRefreshToken.mockResolvedValue(null);

    await expect(service.refreshToken('x')).rejects.toThrow(UnauthorizedException);
  });

  // ───────────────── LOGOUT ─────────────────
  it('logout OK', async () => {
    mockJwtService.hashToken.mockReturnValue('hash');

    const res = await service.logout('raw');

    expect(res.message).toContain('Sesión');
  });

  it('logoutAll OK', async () => {
    const res = await service.logoutAll('1');

    expect(res.message).toContain('Todas');
  });

  // ───────────────── FORGOT PASSWORD ─────────────────
  it('forgotPassword user null', async () => {
    mockAuthRepository.findByEmail.mockResolvedValue(null);

    const res = await service.forgotPassword({ email: 'x' });

    expect(res.message).toContain('Si el correo');
  });

  it('forgotPassword OK', async () => {
    mockAuthRepository.findByEmail.mockResolvedValue({
      userId: '1',
      email: 'x@test.com',
    });

    mockJwtService.generateVerificationToken.mockReturnValue({
      raw: 'r',
      hash: 'h',
    });

    const res = await service.forgotPassword({ email: 'x@test.com' });

    expect(res.message).toContain('Si el correo');
  });

  // ───────────────── RESET PASSWORD ─────────────────
  it('resetPassword token inválido', async () => {
    mockJwtService.hashToken.mockReturnValue('hash');
    mockAuthRepository.findValidVerificationToken.mockResolvedValue(null);

    await expect(
      service.resetPassword({ token: 'x', newPassword: '123' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('resetPassword OK', async () => {
    mockJwtService.hashToken.mockReturnValue('hash');

    mockAuthRepository.findValidVerificationToken.mockResolvedValue({
      userId: '1',
    });

    mockAuthRepository.findById.mockResolvedValue({
      userId: '1',
    });

    const res = await service.resetPassword({
      token: 'x',
      newPassword: '123',
    });

    expect(res.message).toContain('Contraseña');
  });

  it('resetPassword user not found', async () => {
    mockJwtService.hashToken.mockReturnValue('hash');

    mockAuthRepository.findValidVerificationToken.mockResolvedValue({
      userId: '1',
    });

    mockAuthRepository.findById.mockResolvedValue(null);

    await expect(
      service.resetPassword({ token: 'x', newPassword: '123' }),
    ).rejects.toThrow(NotFoundException);
  });

  // ───────────────── GET ME ─────────────────
  it('getMe OK', async () => {
    mockAuthRepository.findById.mockResolvedValue({
      userId: '1',
      email: 'a@test.com',
      role: 'user',
    });

    const res = await service.getMe('1', null);

    expect(res.user.userId).toBe('1');
  });

  it('getMe user not found', async () => {
    mockAuthRepository.findById.mockResolvedValue(null);

    await expect(service.getMe('1', null)).rejects.toThrow(NotFoundException);
  });

  // ───────────────── CHANGE PASSWORD ─────────────────
  it('changePassword OK', async () => {
    mockAuthRepository.findById.mockResolvedValue({ email: 'a@test.com' });
    mockAuthRepository.findByEmail.mockResolvedValue({
      email: 'a@test.com',
    });

    mockAuthRepository.verifyPassword.mockResolvedValue(true);

    const res = await service.changePassword({
      userId: '1',
      currentPassword: '123',
      newPassword: '456',
    });

    expect(res.message).toContain('Contraseña');
  });

  it('changePassword wrong password', async () => {
    mockAuthRepository.findById.mockResolvedValue({ email: 'a@test.com' });
    mockAuthRepository.findByEmail.mockResolvedValue({
      email: 'a@test.com',
    });

    mockAuthRepository.verifyPassword.mockResolvedValue(false);

    await expect(
      service.changePassword({
        userId: '1',
        currentPassword: '123',
        newPassword: '456',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ───────────────── VALIDATE TOKEN ─────────────────
  it('validateToken OK', () => {
    mockJwtService.verifyAccessToken.mockReturnValue({
      sub: '1',
      email: 'a@test.com',
      role: 'user',
      activeProfileId: null,
    });

    const res = service.validateToken({ accessToken: 'x' });

    expect(res.valid).toBe(true);
  });

  it('validateToken FAIL', () => {
    mockJwtService.verifyAccessToken.mockImplementation(() => {
      throw new Error();
    });

    const res = service.validateToken({ accessToken: 'x' });

    expect(res.valid).toBe(false);
  });
});