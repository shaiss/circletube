/**
 * Unit coverage for hasCirclePermission viewer checks (#40).
 * Pending invitees must not receive viewer access; only owners and
 * accepted/active circle members may.
 */
import { hasCirclePermission } from '../../routes/middleware';
import type { IStorage } from '../../storage';

function mockStorage(overrides: Partial<{
  getCircle: jest.Mock;
  getCircleMembers: jest.Mock;
  getUserPendingInvitations: jest.Mock;
}> = {}): IStorage {
  return {
    getCircle: jest.fn().mockResolvedValue({ id: 7, userId: 1, name: 'Test Circle' }),
    getCircleMembers: jest.fn().mockResolvedValue([]),
    getUserPendingInvitations: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as IStorage;
}

describe('hasCirclePermission viewer check', () => {
  it('denies a pending invitee who is not an accepted member', async () => {
    const storage = mockStorage({
      getCircleMembers: jest.fn().mockResolvedValue([]),
      getUserPendingInvitations: jest.fn().mockResolvedValue([
        { id: 1, circleId: 7, inviteeId: 42, status: 'pending', role: 'viewer' },
      ]),
    });

    const allowed = await hasCirclePermission(7, 42, storage, 'viewer');

    expect(allowed).toBe(false);
  });

  it('allows an accepted/active circle member', async () => {
    const storage = mockStorage({
      getCircleMembers: jest.fn().mockResolvedValue([
        { id: 1, circleId: 7, userId: 42, role: 'viewer', status: 'active' },
      ]),
    });

    const allowed = await hasCirclePermission(7, 42, storage, 'viewer');

    expect(allowed).toBe(true);
  });

  it('denies a non-member with no invitation', async () => {
    const storage = mockStorage({
      getCircleMembers: jest.fn().mockResolvedValue([]),
      getUserPendingInvitations: jest.fn().mockResolvedValue([]),
    });

    const allowed = await hasCirclePermission(7, 99, storage, 'viewer');

    expect(allowed).toBe(false);
  });

  it('allows the circle owner regardless of membership rows', async () => {
    const storage = mockStorage({
      getCircle: jest.fn().mockResolvedValue({ id: 7, userId: 1, name: 'Test Circle' }),
      getCircleMembers: jest.fn().mockResolvedValue([]),
    });

    const allowed = await hasCirclePermission(7, 1, storage, 'viewer');

    expect(allowed).toBe(true);
  });
});
