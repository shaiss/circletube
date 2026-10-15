/**
 * Unit tests for CodeRabbit follow-ups on PR #25 / #26:
 * - resolveImportedEquippedTools filters unknown tool IDs and de-dupes
 * - MockStorage.hasCirclePermission ranks collaborator correctly
 * - MockStorage.hasCirclePermission fails closed for unknown requiredRole
 */

import { resolveImportedEquippedTools, getAvailableTools } from '../../tools';
import { MockStorage } from '../helpers/mock-storage';
import { createTestCircleMember } from '../helpers/test-factories';

describe('resolveImportedEquippedTools', () => {
  test('keeps known tool IDs with registry name/description and enables them', () => {
    const registry = getAvailableTools();
    expect(registry.length).toBeGreaterThan(0);

    const knownId = registry[0].id;
    const resolved = resolveImportedEquippedTools([knownId]);

    expect(resolved).toEqual([
      {
        id: registry[0].id,
        name: registry[0].name,
        description: registry[0].description,
        enabled: true,
      },
    ]);
  });

  test('drops unknown tool IDs', () => {
    const resolved = resolveImportedEquippedTools([
      'not-a-real-tool',
      'also-fake',
    ]);
    expect(resolved).toEqual([]);
  });

  test('mix of known and unknown keeps only known, enabled', () => {
    const registry = getAvailableTools();
    const knownId = registry[0].id;
    const resolved = resolveImportedEquippedTools([
      'bogus-tool',
      knownId,
      'another-bogus',
    ]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe(knownId);
    expect(resolved[0].enabled).toBe(true);
    expect(resolved[0].name).toBe(registry[0].name);
  });

  test('de-dupes duplicate equipped IDs (first-seen order)', () => {
    const registry = getAvailableTools();
    expect(registry.length).toBeGreaterThan(0);

    const knownId = registry[0].id;
    const resolved = resolveImportedEquippedTools([knownId, knownId]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toEqual({
      id: registry[0].id,
      name: registry[0].name,
      description: registry[0].description,
      enabled: true,
    });
  });

  test('de-dupes while preserving first-seen order across mixed IDs', () => {
    const registry = getAvailableTools();
    expect(registry.length).toBeGreaterThan(0);

    const knownId = registry[0].id;
    const resolved = resolveImportedEquippedTools([
      'bogus',
      knownId,
      'another-bogus',
      knownId,
      'bogus',
    ]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe(knownId);
    expect(resolved[0].enabled).toBe(true);
    expect(resolved[0].name).toBe(registry[0].name);
  });
});

describe('MockStorage.hasCirclePermission collaborator ranking', () => {
  test('collaborator satisfies collaborator and viewer, not owner', async () => {
    const storage = new MockStorage();
    // Clear default seed member state by using a dedicated circle/user pair
    const circleId = 42;
    const userId = 99;
    const { id: _id, ...member } = createTestCircleMember({
      circleId,
      userId,
      role: 'collaborator',
    });
    await storage.addCircleMember(member);

    expect(await storage.hasCirclePermission(userId, circleId, 'viewer')).toBe(
      true
    );
    expect(
      await storage.hasCirclePermission(userId, circleId, 'collaborator')
    ).toBe(true);
    expect(await storage.hasCirclePermission(userId, circleId, 'owner')).toBe(
      false
    );
  });

  test('viewer does not satisfy collaborator', async () => {
    const storage = new MockStorage();
    const circleId = 43;
    const userId = 100;
    const { id: _id, ...member } = createTestCircleMember({
      circleId,
      userId,
      role: 'viewer',
    });
    await storage.addCircleMember(member);

    expect(await storage.hasCirclePermission(userId, circleId, 'viewer')).toBe(
      true
    );
    expect(
      await storage.hasCirclePermission(userId, circleId, 'collaborator')
    ).toBe(false);
  });

  test('unknown requiredRole fails closed for valid members', async () => {
    const storage = new MockStorage();
    const circleId = 44;
    const userId = 101;
    const { id: _id, ...member } = createTestCircleMember({
      circleId,
      userId,
      role: 'owner',
    });
    await storage.addCircleMember(member);

    expect(
      await storage.hasCirclePermission(userId, circleId, 'admin')
    ).toBe(false);
    expect(
      await storage.hasCirclePermission(userId, circleId, 'superuser')
    ).toBe(false);
    // Known roles still behave as before
    expect(await storage.hasCirclePermission(userId, circleId, 'owner')).toBe(
      true
    );
    expect(await storage.hasCirclePermission(userId, circleId, 'viewer')).toBe(
      true
    );
  });
});
