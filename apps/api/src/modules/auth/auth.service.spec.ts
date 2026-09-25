import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

type MockPrisma = {
  user: { findUnique: jest.Mock; update: jest.Mock };
};

const userFixture = {
  id: 'u1',
  email: 'admin@pharmacy.local',
  username: 'admin',
  firstName: 'Admin',
  lastName: 'User',
  avatarUrl: null,
  status: 'ACTIVE',
  deletedAt: null,
  passwordHash: '',
};

function buildService(overrides?: { user?: unknown; deleted?: boolean }) {
  const prisma: MockPrisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(overrides?.deleted ? { ...userFixture, deletedAt: new Date() } : overrides?.user ?? userFixture),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(prisma as never, {} as never, audit as never);
  return { service, prisma, audit };
}

const requester = { sub: 'u1', id: 'u1', email: 'x', username: 'x', firstName: 'X', lastName: 'Y', roles: [], permissions: [] };

describe('AuthService.changePassword', () => {
  beforeAll(async () => {
    userFixture.passwordHash = await argon2.hash('OldPass1!');
  });

  it('rejects when the user is missing or deleted', async () => {
    const { service } = buildService({ deleted: true });
    await expect(service.changePassword(requester, { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' })).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when the current password is incorrect', async () => {
    const { service } = buildService();
    await expect(
      service.changePassword(requester, { currentPassword: 'Wrong123', newPassword: 'NewPass1!' }),
    ).rejects.toThrow('Current password is incorrect');
  });

  it('hashes the new password, persists it and writes an audit entry', async () => {
    const { service, prisma, audit } = buildService();
    await service.changePassword(requester, { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' });

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const data = prisma.user.update.mock.calls[0][0].data as { passwordHash: string };
    expect(data.passwordHash).not.toBe('NewPass1!');
    await expect(argon2.verify(data.passwordHash, 'NewPass1!')).resolves.toBe(true);
    await expect(argon2.verify(data.passwordHash, 'OldPass1!')).resolves.toBe(false);

    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.change-password', entityType: 'User', entityId: 'u1' }));
  });
});

describe('AuthService.logout (stateless JWT, no revocation)', () => {
  it('records an audit entry and returns success without touching any token store', async () => {
    const { service, prisma, audit } = buildService();
    const result = service.logout('u1');

    expect(result).toEqual({ success: true });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.logout', entityType: 'User', entityId: 'u1' }));
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('AuthService.refresh (stateless re-issue)', () => {
  function buildRefreshService(user: unknown) {
    const prisma: MockPrisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn().mockResolvedValue({}) },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const jwt = {
      verifyAsync: jest.fn((token: string) => {
        if (token === 'invalid') return Promise.reject(new Error('bad'));
        return Promise.resolve({ sub: userFixture.id, type: token === 'refresh-ok' ? 'refresh' : 'access' });
      }),
      sign: jest.fn().mockReturnValue('signed-token'),
    };
    const service = new AuthService(prisma as never, jwt as never, audit as never);
    return { service, jwt };
  }

  const activeUser = { ...userFixture, userRoles: [] };

  it('rejects an invalid/expired refresh token', async () => {
    const { service } = buildRefreshService(activeUser);
    await expect(service.refresh('invalid')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an access token used as a refresh token', async () => {
    const { service } = buildRefreshService(activeUser);
    await expect(service.refresh('access-token')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a refresh token for an inactive or missing user', async () => {
    const { service } = buildRefreshService({ ...userFixture, status: 'INACTIVE', userRoles: [] });
    await expect(service.refresh('refresh-ok')).rejects.toThrow(UnauthorizedException);
  });

  it('re-issues a fresh token pair for an active user without storing or revoking the old one', async () => {
    const { service, jwt } = buildRefreshService(activeUser);
    const result = await service.refresh('refresh-ok');

    expect(result.accessToken).toBe('signed-token');
    expect(result.refreshToken).toBe('signed-token');
    expect(jwt.sign).toHaveBeenCalledTimes(2);
  });
});