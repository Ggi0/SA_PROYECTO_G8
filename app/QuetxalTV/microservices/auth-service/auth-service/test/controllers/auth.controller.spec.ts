// test/controllers/auth.controller.spec.ts

import { AuthController } from '../../src/auth/auth.controller';
import { NotFoundException } from '@nestjs/common';

describe('AuthController (ROBUST)', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    validateToken: jest.fn(),
    getMe: jest.fn(),
    changePassword: jest.fn(),
    authRepository: {
      findById: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(mockAuthService as any);
  });

  // ─────────────────────────────────────────────
  // VALIDATE TOKEN
  // ─────────────────────────────────────────────
  it('should validate token', () => {
    mockAuthService.validateToken.mockReturnValue({ valid: true });

    const res = controller.validateToken({ accessToken: 'x' });

    expect(res.valid).toBe(true);
    expect(mockAuthService.validateToken).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────
  it('should register with displayName (camelCase)', async () => {
    mockAuthService.register.mockResolvedValue({ userId: '1' });

    const res = await controller.register({
      email: 'a@test.com',
      password: '123',
      displayName: 'User',
    });

    expect(res.userId).toBe('1');
    expect(mockAuthService.register).toHaveBeenCalledWith({
      email: 'a@test.com',
      password: '123',
      displayName: 'User',
    });
  });

  it('should register with display_name (snake_case)', async () => {
    mockAuthService.register.mockResolvedValue({ userId: '1' });

    await controller.register({
      email: 'a@test.com',
      password: '123',
      display_name: 'UserSnake',
    });

    expect(mockAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'UserSnake',
      }),
    );
  });

  it('should fallback to empty displayName', async () => {
    mockAuthService.register.mockResolvedValue({ userId: '1' });

    await controller.register({
      email: 'a@test.com',
      password: '123',
    });

    expect(mockAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: '',
      }),
    );
  });

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────
  it('should login correctly', async () => {
    mockAuthService.login.mockResolvedValue({ accessToken: 'token' });

    const res = await controller.login({
      email: 'a@test.com',
      password: '123',
    });

    expect(res.accessToken).toBe('token');
  });

  // ─────────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────────
  it('should refresh token', async () => {
    mockAuthService.refreshToken.mockResolvedValue({ accessToken: 'new' });

    const res = await controller.refreshToken({
      refreshToken: 'r',
    });

    expect(res.accessToken).toBe('new');
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith('r');
  });

  // ─────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────
  it('should logout', async () => {
    mockAuthService.logout.mockResolvedValue({ message: 'ok' });

    const res = await controller.logout({ refreshToken: 'r' });

    expect(res.message).toBe('ok');
  });

  // ─────────────────────────────────────────────
  // LOGOUT ALL
  // ─────────────────────────────────────────────
  it('should logout all', async () => {
    mockAuthService.logoutAll.mockResolvedValue({ message: 'ok' });

    const res = await controller.logoutAll({ userId: '1' });

    expect(res.message).toBe('ok');
  });

  // ─────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────
  it('should call forgotPassword', async () => {
    mockAuthService.forgotPassword.mockResolvedValue({ message: 'ok' });

    const res = await controller.forgotPassword({
      email: 'a@test.com',
    });

    expect(res.message).toBe('ok');
  });

  // ─────────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────────
  it('should call resetPassword', async () => {
    mockAuthService.resetPassword.mockResolvedValue({
      message: 'updated',
    });

    const res = await controller.resetPassword({
      token: 't',
      newPassword: '123',
    });

    expect(res.message).toBe('updated');
  });

  // ─────────────────────────────────────────────
  // GET ME
  // ─────────────────────────────────────────────
  it('should getMe correctly', async () => {
    mockAuthService.getMe.mockResolvedValue({
      user: { userId: '1' },
    });

    const res = await controller.getMe({
      userId: '1',
      activeProfileId: '',
    });

    expect(res.user.userId).toBe('1');
  });

  // ─────────────────────────────────────────────
  // CHANGE PASSWORD
  // ─────────────────────────────────────────────
  it('should changePassword', async () => {
    mockAuthService.changePassword.mockResolvedValue({
      message: 'ok',
    });

    const res = await controller.changePassword({
      userId: '1',
      currentPassword: '123',
      newPassword: '456',
    });

    expect(res.message).toBe('ok');
  });

  // ─────────────────────────────────────────────
  // GET USER BY ID
  // ─────────────────────────────────────────────
  it('should return user', async () => {
    mockAuthService.authRepository.findById.mockResolvedValue({
      userId: '1',
      email: 'a@test.com',
      role: 'user',
      isActive: true,
    });

    const res = await controller.getUserById({ userId: '1' });

    expect(res.userId).toBe('1');
    expect(res.email).toBe('a@test.com');
  });

  it('should throw if user not found', async () => {
    mockAuthService.authRepository.findById.mockResolvedValue(null);

    await expect(
      controller.getUserById({ userId: 'x' }),
    ).rejects.toThrow(NotFoundException);
  });
});