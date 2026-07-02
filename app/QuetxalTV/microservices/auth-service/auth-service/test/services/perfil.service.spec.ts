// test/perfil.service.spec.ts

import { createHmac } from 'node:crypto';
import { PerfilService } from '../../src/perfil/perfil.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('PerfilService', () => {
  let service: PerfilService;

  const mockPerfilRepository = {
    findAllByUser: jest.fn(),
    countByUser: jest.fn(),
    create: jest.fn(),
    findByIdAndUser: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    setParentalPin: jest.fn(),
    getParentalPin: jest.fn(),
  };

  const mockAuthRepository = {
    findById: jest.fn(),
  };

  const mockJwtService = {
    signAccessToken: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PerfilService(
      mockPerfilRepository as any,
      mockAuthRepository as any,
      mockJwtService as any,
    );
  });

  // ─────────────────────────────────────────────
  // LIST PROFILES
  // ─────────────────────────────────────────────
  it('should list profiles successfully', async () => {
    mockPerfilRepository.findAllByUser.mockResolvedValue([
      {
        profileId: '1',
        displayName: 'User1',
        avatarUrl: null,
        isKidsMode: false,
      },
    ]);

    const result = await service.listProfiles({ userId: 'u1' });

    expect(result.count).toBe(1);
    expect(result.profiles.length).toBe(1);
  });

  // ─────────────────────────────────────────────
  // CREATE PROFILE
  // ─────────────────────────────────────────────
  it('should create profile successfully', async () => {
    mockPerfilRepository.countByUser.mockResolvedValue(1);

    mockPerfilRepository.create.mockResolvedValue({
      profileId: 'p1',
      displayName: 'Test',
      isKidsMode: false,
      avatarUrl: null,
    });

    const result = await service.createProfile({
      userId: 'u1',
      displayName: 'Test',
    });

    expect(result.profile.profileId).toBe('p1');
  });

  it('should fail if max profiles reached', async () => {
    mockPerfilRepository.countByUser.mockResolvedValue(999);

    await expect(
      service.createProfile({
        userId: 'u1',
        displayName: 'Test',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ─────────────────────────────────────────────
  // UPDATE PROFILE
  // ─────────────────────────────────────────────
  it('should update profile successfully', async () => {
    mockPerfilRepository.findByIdAndUser.mockResolvedValue({
      profileId: 'p1',
    });

    mockPerfilRepository.update.mockResolvedValue({
      profileId: 'p1',
      displayName: 'New',
      avatarUrl: null,
      isKidsMode: false,
    });

    const result = await service.updateProfile({
      userId: 'u1',
      profileId: 'p1',
      displayName: 'New',
    });

    expect(result.profile.displayName).toBe('New');
  });

  it('should fail update if profile not found', async () => {
    mockPerfilRepository.findByIdAndUser.mockResolvedValue(null);

    await expect(
      service.updateProfile({
        userId: 'u1',
        profileId: 'x',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  // ─────────────────────────────────────────────
  // DELETE PROFILE
  // ─────────────────────────────────────────────
  it('should delete profile successfully', async () => {
    mockPerfilRepository.findByIdAndUser.mockResolvedValue({
      profileId: 'p1',
    });

    mockPerfilRepository.countByUser.mockResolvedValue(2);

    const result = await service.deleteProfile({
      userId: 'u1',
      profileId: 'p1',
    });

    expect(result.message).toContain('correctamente');
  });

  it('should fail delete if profile not found', async () => {
    mockPerfilRepository.findByIdAndUser.mockResolvedValue(null);

    await expect(
      service.deleteProfile({
        userId: 'u1',
        profileId: 'x',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should fail delete if only one profile', async () => {
    mockPerfilRepository.findByIdAndUser.mockResolvedValue({
      profileId: 'p1',
    });

    mockPerfilRepository.countByUser.mockResolvedValue(1);

    await expect(
      service.deleteProfile({
        userId: 'u1',
        profileId: 'p1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ─────────────────────────────────────────────
  // SELECT PROFILE
  // ─────────────────────────────────────────────
  it('should select profile successfully', async () => {
    mockPerfilRepository.findByIdAndUser.mockResolvedValue({
      profileId: 'p1',
      displayName: 'Test',
      avatarUrl: null,
      isKidsMode: false,
    });

    mockAuthRepository.findById.mockResolvedValue({
      userId: 'u1',
      email: 'test@test.com',
      role: 'user',
      tokenVersion: 1,
      isActive: true,
    });

    mockJwtService.signAccessToken.mockReturnValue('token');

    const result = await service.selectProfile({
      userId: 'u1',
      profileId: 'p1',
    });

    expect(result.accessToken).toBe('token');
    expect(result.activeProfile.profileId).toBe('p1');
  });

  it('should fail select if profile not found', async () => {
    mockPerfilRepository.findByIdAndUser.mockResolvedValue(null);

    await expect(
      service.selectProfile({
        userId: 'u1',
        profileId: 'x',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should fail select if user inactive', async () => {
    mockPerfilRepository.findByIdAndUser.mockResolvedValue({
      profileId: 'p1',
    });

    mockAuthRepository.findById.mockResolvedValue({
      isActive: false,
    });

    await expect(
      service.selectProfile({
        userId: 'u1',
        profileId: 'p1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  // ─────────────────────────────────────────────
  // SET PARENTAL PIN
  // ─────────────────────────────────────────────
  it('should set parental pin successfully', async () => {
    mockPerfilRepository.setParentalPin.mockResolvedValue(undefined);
    const result = await service.setParentalPin({ userId: 'u1', pin: '1234' });
    expect(result.success).toBe(true);
    expect(result.message).toContain('configurado');
  });

  it('should remove parental pin when pin is empty', async () => {
    mockPerfilRepository.setParentalPin.mockResolvedValue(undefined);
    const result = await service.setParentalPin({ userId: 'u1', pin: '' });
    expect(result.success).toBe(true);
    expect(result.message).toContain('eliminado');
  });

  it('should throw if pin is not 4 digits', async () => {
    await expect(
      service.setParentalPin({ userId: 'u1', pin: 'abc' }),
    ).rejects.toThrow(BadRequestException);
  });

  // ─────────────────────────────────────────────
  // VERIFY PARENTAL PIN
  // ─────────────────────────────────────────────
  it('should return valid=true when no pin is set', async () => {
    mockPerfilRepository.getParentalPin.mockResolvedValue(null);
    const result = await service.verifyParentalPin({ userId: 'u1', pin: '0000' });
    expect(result.valid).toBe(true);
  });

  it('should return valid=true when pin matches', async () => {
    const hash = createHmac('sha256', 'u1').update('1234').digest('hex');
    mockPerfilRepository.getParentalPin.mockResolvedValue(hash);
    const result = await service.verifyParentalPin({ userId: 'u1', pin: '1234' });
    expect(result.valid).toBe(true);
  });

  it('should return valid=false when pin does not match', async () => {
    const hash = createHmac('sha256', 'u1').update('1234').digest('hex');
    mockPerfilRepository.getParentalPin.mockResolvedValue(hash);
    const result = await service.verifyParentalPin({ userId: 'u1', pin: '9999' });
    expect(result.valid).toBe(false);
  });
});