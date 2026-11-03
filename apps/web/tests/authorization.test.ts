import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canAccess,
  type Membership,
} from '../src/modules/identity/domain/authorization.ts';

const member: Membership = {
  userId: 'user-a',
  organizationId: 'org-a',
  communityId: 'community-a',
  permissions: ['incidents.read'],
  status: 'active',
};
const resource = { organizationId: 'org-a', communityId: 'community-a' };
test('authorized membership can read its own community', () =>
  assert.equal(
    canAccess('user-a', [member], resource, 'incidents.read'),
    true,
  ));
test('rejects anonymous and foreign identities', () => {
  for (const user of [null, 'user-b'])
    assert.equal(canAccess(user, [member], resource, 'incidents.read'), false);
});
test('rejects cross-tenant and cross-community resources', () => {
  assert.equal(
    canAccess(
      'user-a',
      [member],
      { ...resource, organizationId: 'org-b' },
      'incidents.read',
    ),
    false,
  );
  assert.equal(
    canAccess(
      'user-a',
      [member],
      { ...resource, communityId: 'community-b' },
      'incidents.read',
    ),
    false,
  );
});
test('read permission never grants writes', () =>
  assert.equal(
    canAccess('user-a', [member], resource, 'incidents.write'),
    false,
  ));
test('suspended membership and empty contexts are denied', () => {
  assert.equal(
    canAccess(
      'user-a',
      [{ ...member, status: 'suspended' }],
      resource,
      'incidents.read',
    ),
    false,
  );
  assert.equal(canAccess('user-a', [], resource, 'incidents.read'), false);
  assert.equal(
    canAccess(
      'user-a',
      [member],
      { ...resource, communityId: '' },
      'incidents.read',
    ),
    false,
  );
});
