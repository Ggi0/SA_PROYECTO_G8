// test/controllers/perfil.controller.spec.ts

import { PerfilController } from '../../src/perfil/perfil.controller';

describe('PerfilController (ROBUST)', () => {
  let controller: PerfilController;

  const mockPerfilService = {
    listProfiles: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
    selectProfile: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PerfilController(mockPerfilService as any);
  });

  // ─────────────────────────────────────────────
  // LIST PROFILES
  // ─────────────────────────────────────────────
  it('should list profiles', async () => {
    mockPerfilService.listProfiles.mockResolvedValue({
      profiles: [],
      count: 0,
    });

    const res = await controller.listProfiles({ userId: 'u1' });

    expect(res.count).toBe(0);
    expect(mockPerfilService.listProfiles).toHaveBeenCalledWith({
      userId: 'u1',
    });
  });

  // ─────────────────────────────────────────────
  // CREATE PROFILE
  // ─────────────────────────────────────────────
  it('should create profile', async () => {
    mockPerfilService.createProfile.mockResolvedValue({
      profile: { profileId: 'p1' },
    });

    const data = {
      userId: 'u1',
      displayName: 'Test',
    };

    const res = await controller.createProfile(data);

    expect(res.profile.profileId).toBe('p1');
    expect(mockPerfilService.createProfile).toHaveBeenCalledWith(data);
  });

  // ─────────────────────────────────────────────
  // UPDATE PROFILE
  // ─────────────────────────────────────────────
  it('should update profile', async () => {
    mockPerfilService.updateProfile.mockResolvedValue({
      profile: { profileId: 'p1', displayName: 'Updated' },
    });

    const data = {
      userId: 'u1',
      profileId: 'p1',
      displayName: 'Updated',
    };

    const res = await controller.updateProfile(data);

    expect(res.profile.displayName).toBe('Updated');
    expect(mockPerfilService.updateProfile).toHaveBeenCalledWith(data);
  });

  // ─────────────────────────────────────────────
  // DELETE PROFILE
  // ─────────────────────────────────────────────
  it('should delete profile', async () => {
    mockPerfilService.deleteProfile.mockResolvedValue({
      message: 'Perfil eliminado correctamente.',
    });

    const data = {
      userId: 'u1',
      profileId: 'p1',
    };

    const res = await controller.deleteProfile(data);

    expect(res.message).toContain('Perfil eliminado');
    expect(mockPerfilService.deleteProfile).toHaveBeenCalledWith(data);
  });

  // ─────────────────────────────────────────────
  // SELECT PROFILE
  // ─────────────────────────────────────────────
  it('should select profile', async () => {
    mockPerfilService.selectProfile.mockResolvedValue({
      accessToken: 'token',
      activeProfile: { profileId: 'p1' },
    });

    const data = {
      userId: 'u1',
      profileId: 'p1',
    };

    const res = await controller.selectProfile(data);

    expect(res.accessToken).toBe('token');
    expect(res.activeProfile.profileId).toBe('p1');
    expect(mockPerfilService.selectProfile).toHaveBeenCalledWith(data);
  });

  // ─────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────

  it('should propagate errors from service (create)', async () => {
    mockPerfilService.createProfile.mockRejectedValue(new Error('fail'));

    await expect(
      controller.createProfile({
        userId: 'u1',
        displayName: 'Test',
      }),
    ).rejects.toThrow('fail');
  });

  it('should propagate errors from service (delete)', async () => {
    mockPerfilService.deleteProfile.mockRejectedValue(
      new Error('delete fail'),
    );

    await expect(
      controller.deleteProfile({
        userId: 'u1',
        profileId: 'p1',
      }),
    ).rejects.toThrow('delete fail');
  });
});