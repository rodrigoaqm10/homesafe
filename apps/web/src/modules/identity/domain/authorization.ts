export type Membership = {
  userId: string;
  organizationId: string;
  communityId: string;
  permissions: readonly string[];
  status: 'active' | 'suspended';
};
export type Resource = { organizationId: string; communityId: string };
/** Only server-verified memberships may be supplied. Never trust client tenant IDs. */
export function canAccess(
  userId: string | null,
  memberships: readonly Membership[],
  resource: Resource,
  permission: string,
): boolean {
  if (
    !userId ||
    !resource.organizationId ||
    !resource.communityId ||
    !permission
  )
    return false;
  return memberships.some(
    (m) =>
      m.userId === userId &&
      m.status === 'active' &&
      m.organizationId === resource.organizationId &&
      m.communityId === resource.communityId &&
      m.permissions.includes(permission),
  );
}
