import 'server-only';
import type { createClient } from '@/lib/supabase/server';
import type { Membership } from './session';
export async function hasCommunityPro(
  client: Awaited<ReturnType<typeof createClient>>,
  member: Membership,
) {
  const { data, error } = await client.rpc('community_has_pro', {
    org: member.organization_id,
    community: member.community_id,
  });
  return !error && data === true;
}
